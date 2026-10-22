// Microservicio de REPORTES
// Lenguaje: Go | Framework: Gin | ORM: GORM | BD: PostgreSQL
//
// Endpoints:
//
//	GET    /health             -> estado del servicio
//	GET    /reportes/resumen   -> calcula estadisticas EN VIVO (consulta Python, Node y Java)
//	POST   /reportes           -> calcula el resumen y lo GUARDA en PostgreSQL
//	GET    /reportes           -> historial de reportes guardados
//	GET    /reportes/:id       -> un reporte guardado
//	DELETE /reportes/:id       -> elimina un reporte guardado
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Config guarda las variables de entorno que usa el servicio.
type Config struct {
	Puerto       string
	DatabaseURL  string
	UsuariosURL  string
	ProductosURL string
	OrdenesURL   string
}

func env(nombre, porDefecto string) string {
	if v := os.Getenv(nombre); v != "" {
		return v
	}
	return porDefecto
}

func cargarConfig() Config {
	_ = godotenv.Load() // lee .env si existe (si no existe, no pasa nada)
	return Config{
		Puerto:       env("PORT", "8080"),
		DatabaseURL:  env("DATABASE_URL", "postgres://admin:supersecreta@localhost:5432/reportes_db?sslmode=disable"),
		UsuariosURL:  env("USUARIOS_SERVICE_URL", "http://localhost:8001"),
		ProductosURL: env("PRODUCTOS_SERVICE_URL", "http://localhost:8002"),
		OrdenesURL:   env("ORDENES_SERVICE_URL", "http://localhost:8003"),
	}
}

// conectarBD reintenta la conexion por si PostgreSQL todavia esta arrancando.
func conectarBD(url string) *gorm.DB {
	for intento := 1; intento <= 30; intento++ {
		db, err := gorm.Open(postgres.Open(url), &gorm.Config{})
		if err == nil {
			return db
		}
		log.Printf("[go] Esperando PostgreSQL (%d/30): %v", intento, err)
		time.Sleep(2 * time.Second)
	}
	log.Fatal("[go] No se pudo conectar a PostgreSQL")
	return nil
}

// cors permite que el navegador llame a este servicio directamente (puerto 8004).
func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func main() {
	cfg := cargarConfig()
	db := conectarBD(cfg.DatabaseURL)

	// AutoMigrate crea o actualiza la tabla "reportes" segun el struct Reporte
	if err := db.AutoMigrate(&Reporte{}); err != nil {
		log.Fatalf("[go] Error en AutoMigrate: %v", err)
	}

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.Use(cors())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "servicio": "reportes", "lenguaje": "Go", "bd": "PostgreSQL"})
	})

	r.GET("/reportes/resumen", func(c *gin.Context) {
		c.JSON(http.StatusOK, calcularResumen(obtenerDatos(cfg)))
	})

	r.POST("/reportes", func(c *gin.Context) {
		resumen := calcularResumen(obtenerDatos(cfg))
		detalle, _ := json.Marshal(resumen)

		productoTop := ""
		if len(resumen.TopProductos) > 0 {
			productoTop = resumen.TopProductos[0].Nombre
		}
		reporte := Reporte{
			TotalVentas:    resumen.TotalVentas,
			TotalOrdenes:   resumen.TotalOrdenes,
			TotalUsuarios:  resumen.TotalUsuarios,
			TotalProductos: resumen.TotalProductos,
			ProductoTop:    productoTop,
			Detalle:        string(detalle),
		}
		if err := db.Create(&reporte).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, reporte.aJSON())
	})

	r.GET("/reportes", func(c *gin.Context) {
		var reportes []Reporte
		db.Order("created_at desc").Limit(50).Find(&reportes)
		salida := make([]ReporteJSON, 0, len(reportes))
		for _, rep := range reportes {
			salida = append(salida, rep.aJSON())
		}
		c.JSON(http.StatusOK, salida)
	})

	r.GET("/reportes/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		var reporte Reporte
		if err != nil || db.First(&reporte, id).Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reporte no encontrado"})
			return
		}
		c.JSON(http.StatusOK, reporte.aJSON())
	})

	r.DELETE("/reportes/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Id invalido"})
			return
		}
		res := db.Delete(&Reporte{}, id)
		if res.Error != nil || res.RowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reporte no encontrado"})
			return
		}
		c.Status(http.StatusNoContent)
	})

	log.Printf("[go] Servicio de reportes escuchando en el puerto %s", cfg.Puerto)
	if err := r.Run(":" + cfg.Puerto); err != nil {
		log.Fatal(err)
	}
}
