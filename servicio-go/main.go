// Microservicio de REPORTES
// Lenguaje: Go | Framework: Gin | ORM: GORM | BD: PostgreSQL
//
// Endpoints:
//
//	GET    /health               -> estado del servicio
//	GET    /reportes/resumen     -> calcula estadisticas EN VIVO (?desde=AAAA-MM-DD&hasta=AAAA-MM-DD)
//	POST   /reportes             -> calcula el resumen y lo GUARDA en PostgreSQL { titulo, desde, hasta }
//	GET    /reportes             -> historial de reportes guardados
//	GET    /reportes/:id         -> un reporte guardado (con todo el detalle)
//	GET    /reportes/:id/csv     -> descarga el reporte en CSV (se abre con Excel)
//	DELETE /reportes/:id         -> elimina un reporte guardado
//
// Al guardar o eliminar un reporte avisa a servicio-node (POST /interno/eventos) para que
// los paneles abiertos actualicen la lista en tiempo real.
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
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
	EventosURL   string
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
		EventosURL:   env("EVENTOS_URL", "http://localhost:8002/interno/eventos"),
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
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Header("Access-Control-Expose-Headers", "Content-Disposition")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// usuarioDe lee el nombre que envia el API Gateway (%-codificado).
func usuarioDe(c *gin.Context) string {
	if v, err := url.QueryUnescape(c.GetHeader("X-Usuario-Nombre")); err == nil && v != "" {
		return v
	}
	return "Sistema"
}

func buscarReporte(db *gorm.DB, c *gin.Context) (Reporte, bool) {
	var reporte Reporte
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || db.First(&reporte, id).Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Reporte no encontrado"})
		return reporte, false
	}
	return reporte, true
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
		periodo, err := nuevoPeriodo(c.Query("desde"), c.Query("hasta"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, calcularResumen(obtenerDatos(cfg), periodo))
	})

	r.POST("/reportes", func(c *gin.Context) {
		var entrada struct {
			Titulo string `json:"titulo"`
			Desde  string `json:"desde"`
			Hasta  string `json:"hasta"`
		}
		_ = c.ShouldBindJSON(&entrada) // el cuerpo es opcional
		periodo, err := nuevoPeriodo(entrada.Desde, entrada.Hasta)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		datos := obtenerDatos(cfg)
		if len(datos.NoDisponibles) > 0 {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "No se puede guardar un reporte incompleto. Sin respuesta de: " + strings.Join(datos.NoDisponibles, ", "),
			})
			return
		}
		resumen := calcularResumen(datos, periodo)
		detalle, _ := json.Marshal(resumen)

		titulo := strings.TrimSpace(entrada.Titulo)
		if titulo == "" {
			titulo = fmt.Sprintf("Reporte del %s al %s", periodo.Desde.Format("02/01/2006"), periodo.Hasta.Format("02/01/2006"))
		}
		if len([]rune(titulo)) > 120 {
			titulo = string([]rune(titulo)[:120])
		}
		productoTop := ""
		if len(resumen.TopProductos) > 0 {
			productoTop = resumen.TopProductos[0].Nombre
		}
		reporte := Reporte{
			Titulo:         titulo,
			Desde:          resumen.Desde,
			Hasta:          resumen.Hasta,
			GeneradoPor:    usuarioDe(c),
			TotalVentas:    resumen.TotalVentas,
			GananciaBruta:  resumen.GananciaBruta,
			TotalOrdenes:   resumen.TotalOrdenes,
			TotalUsuarios:  resumen.TotalClientes,
			TotalProductos: resumen.TotalProductos,
			ProductoTop:    productoTop,
			Detalle:        string(detalle),
		}
		if err := db.Create(&reporte).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo guardar el reporte"})
			return
		}
		publicarEvento(cfg, c, "creado", reporte.ID, "Generó el reporte \""+reporte.Titulo+"\"")
		c.JSON(http.StatusCreated, reporte.aJSON(true))
	})

	r.GET("/reportes", func(c *gin.Context) {
		var reportes []Reporte
		db.Omit("detalle").Order("created_at desc").Limit(100).Find(&reportes)
		salida := make([]ReporteJSON, 0, len(reportes))
		for _, rep := range reportes {
			salida = append(salida, rep.aJSON(false))
		}
		c.JSON(http.StatusOK, salida)
	})

	r.GET("/reportes/:id", func(c *gin.Context) {
		if reporte, ok := buscarReporte(db, c); ok {
			c.JSON(http.StatusOK, reporte.aJSON(true))
		}
	})

	r.GET("/reportes/:id/csv", func(c *gin.Context) {
		reporte, ok := buscarReporte(db, c)
		if !ok {
			return
		}
		var resumen Resumen
		if err := json.Unmarshal([]byte(reporte.Detalle), &resumen); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "El reporte está dañado"})
			return
		}
		contenido, err := generarCSV(reporte, resumen)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo generar el CSV"})
			return
		}
		nombre := fmt.Sprintf("reporte-%d-%s.csv", reporte.ID, reporte.Hasta)
		c.Header("Content-Disposition", `attachment; filename="`+nombre+`"`)
		c.Data(http.StatusOK, "text/csv; charset=utf-8", contenido)
	})

	r.DELETE("/reportes/:id", func(c *gin.Context) {
		id, err := strconv.Atoi(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Id inválido"})
			return
		}
		var reporte Reporte
		if db.Select("id", "titulo").First(&reporte, id).Error != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Reporte no encontrado"})
			return
		}
		if err := db.Delete(&Reporte{}, id).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo eliminar el reporte"})
			return
		}
		publicarEvento(cfg, c, "eliminado", reporte.ID, "Eliminó el reporte \""+reporte.Titulo+"\"")
		c.Status(http.StatusNoContent)
	})

	r.NoRoute(func(c *gin.Context) { c.JSON(http.StatusNotFound, gin.H{"error": "Ruta no encontrada"}) })

	log.Printf("[go] Servicio de reportes escuchando en el puerto %s", cfg.Puerto)
	if err := r.Run(":" + cfg.Puerto); err != nil {
		log.Fatal(err)
	}
}
