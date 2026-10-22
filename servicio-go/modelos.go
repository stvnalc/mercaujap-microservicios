package main

import (
	"encoding/json"

	"gorm.io/gorm"
)

// Reporte es la tabla "reportes" en PostgreSQL (GORM la crea con AutoMigrate).
// Guarda una "foto" del estado del negocio en un momento dado.
type Reporte struct {
	gorm.Model             // agrega ID, CreatedAt, UpdatedAt y DeletedAt
	TotalVentas    float64 `json:"totalVentas"`
	TotalOrdenes   int     `json:"totalOrdenes"`
	TotalUsuarios  int     `json:"totalUsuarios"`
	TotalProductos int     `json:"totalProductos"`
	ProductoTop    string  `json:"productoTop"`
	Detalle        string  `json:"-" gorm:"type:jsonb"` // el resumen completo en JSON
}

// ReporteJSON es como se devuelve un reporte guardado por la API.
type ReporteJSON struct {
	ID             uint            `json:"id"`
	CreadoEn       string          `json:"creadoEn"`
	TotalVentas    float64         `json:"totalVentas"`
	TotalOrdenes   int             `json:"totalOrdenes"`
	TotalUsuarios  int             `json:"totalUsuarios"`
	TotalProductos int             `json:"totalProductos"`
	ProductoTop    string          `json:"productoTop"`
	Detalle        json.RawMessage `json:"detalle"`
}

func (r Reporte) aJSON() ReporteJSON {
	return ReporteJSON{
		ID:             r.ID,
		CreadoEn:       r.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		TotalVentas:    r.TotalVentas,
		TotalOrdenes:   r.TotalOrdenes,
		TotalUsuarios:  r.TotalUsuarios,
		TotalProductos: r.TotalProductos,
		ProductoTop:    r.ProductoTop,
		Detalle:        json.RawMessage(r.Detalle),
	}
}

// ---- Estructuras que llegan de los OTROS microservicios ----

// Usuario viene de servicio-python (GET /usuarios)
type Usuario struct {
	ID     int    `json:"id"`
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
}

// Producto viene de servicio-node (GET /productos)
type Producto struct {
	ID        string  `json:"_id"`
	Nombre    string  `json:"nombre"`
	Categoria string  `json:"categoria"`
	Precio    float64 `json:"precio"`
	Stock     int     `json:"stock"`
	Icono     string  `json:"icono"`
}

// Orden viene de servicio-java (GET /ordenes)
type Orden struct {
	ID            int         `json:"id"`
	UsuarioID     int         `json:"usuarioId"`
	UsuarioNombre string      `json:"usuarioNombre"`
	Total         float64     `json:"total"`
	Estado        string      `json:"estado"`
	Fecha         string      `json:"fecha"`
	Items         []OrdenItem `json:"items"`
}

type OrdenItem struct {
	ProductoID     string  `json:"productoId"`
	ProductoNombre string  `json:"productoNombre"`
	PrecioUnitario float64 `json:"precioUnitario"`
	Cantidad       int     `json:"cantidad"`
	Subtotal       float64 `json:"subtotal"`
}
