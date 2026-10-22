package main

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// Reporte es la tabla "reportes" en PostgreSQL (GORM la crea con AutoMigrate).
// Guarda una "foto" del estado del negocio para un periodo.
type Reporte struct {
	gorm.Model             // agrega ID, CreatedAt, UpdatedAt y DeletedAt
	Titulo         string  `gorm:"size:120"`
	Desde          string  `gorm:"size:10"` // AAAA-MM-DD
	Hasta          string  `gorm:"size:10"`
	GeneradoPor    string  `gorm:"size:100"`
	TotalVentas    float64 `json:"totalVentas"`
	GananciaBruta  float64 `json:"gananciaBruta"`
	TotalOrdenes   int     `json:"totalOrdenes"`
	TotalUsuarios  int     `json:"totalUsuarios"`
	TotalProductos int     `json:"totalProductos"`
	ProductoTop    string  `json:"productoTop"`
	Detalle        string  `json:"-" gorm:"type:jsonb"` // el resumen completo en JSON
}

// ReporteJSON es como se devuelve un reporte guardado por la API.
type ReporteJSON struct {
	ID             uint            `json:"id"`
	Titulo         string          `json:"titulo"`
	Desde          string          `json:"desde"`
	Hasta          string          `json:"hasta"`
	GeneradoPor    string          `json:"generadoPor"`
	CreadoEn       string          `json:"creadoEn"`
	TotalVentas    float64         `json:"totalVentas"`
	GananciaBruta  float64         `json:"gananciaBruta"`
	TotalOrdenes   int             `json:"totalOrdenes"`
	TotalUsuarios  int             `json:"totalUsuarios"`
	TotalProductos int             `json:"totalProductos"`
	ProductoTop    string          `json:"productoTop"`
	Detalle        json.RawMessage `json:"detalle,omitempty"`
}

func (r Reporte) aJSON(conDetalle bool) ReporteJSON {
	salida := ReporteJSON{
		ID:             r.ID,
		Titulo:         r.Titulo,
		Desde:          r.Desde,
		Hasta:          r.Hasta,
		GeneradoPor:    r.GeneradoPor,
		CreadoEn:       r.CreatedAt.Format(time.RFC3339),
		TotalVentas:    r.TotalVentas,
		GananciaBruta:  r.GananciaBruta,
		TotalOrdenes:   r.TotalOrdenes,
		TotalUsuarios:  r.TotalUsuarios,
		TotalProductos: r.TotalProductos,
		ProductoTop:    r.ProductoTop,
	}
	if conDetalle {
		salida.Detalle = json.RawMessage(r.Detalle)
	}
	return salida
}

// ---- Estructuras que llegan de los OTROS microservicios ----

// Usuario viene de servicio-python (GET /usuarios)
type Usuario struct {
	ID     int    `json:"id"`
	Nombre string `json:"nombre"`
	Email  string `json:"email"`
	Rol    string `json:"rol"`
	Activo bool   `json:"activo"`
}

// Producto viene de servicio-node (GET /productos)
type Producto struct {
	ID          string  `json:"_id"`
	Sku         string  `json:"sku"`
	Nombre      string  `json:"nombre"`
	Marca       string  `json:"marca"`
	Categoria   string  `json:"categoria"`
	Precio      float64 `json:"precio"`
	Costo       float64 `json:"costo"`
	Stock       int     `json:"stock"`
	StockMinimo int     `json:"stockMinimo"`
	Activo      bool    `json:"activo"`
}

// Orden viene de servicio-java (GET /ordenes)
type Orden struct {
	ID            int         `json:"id"`
	Codigo        string      `json:"codigo"`
	UsuarioID     int         `json:"usuarioId"`
	UsuarioNombre string      `json:"usuarioNombre"`
	MetodoPago    string      `json:"metodoPago"`
	Subtotal      float64     `json:"subtotal"`
	Impuesto      float64     `json:"impuesto"`
	Total         float64     `json:"total"`
	Estado        string      `json:"estado"`
	Fecha         time.Time   `json:"fecha"`
	Items         []OrdenItem `json:"items"`
}

type OrdenItem struct {
	ProductoID     string  `json:"productoId"`
	ProductoNombre string  `json:"productoNombre"`
	PrecioUnitario float64 `json:"precioUnitario"`
	Cantidad       int     `json:"cantidad"`
	Subtotal       float64 `json:"subtotal"`
}
