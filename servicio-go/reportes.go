package main

import (
	"math"
	"sort"
	"time"
)

// Resumen es el reporte calculado a partir de los datos de los otros servicios.
type Resumen struct {
	GeneradoEn             string            `json:"generadoEn"`
	TotalUsuarios          int               `json:"totalUsuarios"`
	TotalProductos         int               `json:"totalProductos"`
	TotalOrdenes           int               `json:"totalOrdenes"`
	OrdenesPorEstado       map[string]int    `json:"ordenesPorEstado"`
	TotalVentas            float64           `json:"totalVentas"`
	TicketPromedio         float64           `json:"ticketPromedio"`
	UnidadesVendidas       int               `json:"unidadesVendidas"`
	ValorInventario        float64           `json:"valorInventario"`
	TopProductos           []RankingProducto `json:"topProductos"`
	TopClientes            []RankingCliente  `json:"topClientes"`
	VentasPorCategoria     []VentasCategoria `json:"ventasPorCategoria"`
	StockBajo              []Producto        `json:"stockBajo"`
	ServiciosNoDisponibles []string          `json:"serviciosNoDisponibles"`
}

type RankingProducto struct {
	Nombre   string  `json:"nombre"`
	Icono    string  `json:"icono"`
	Cantidad int     `json:"cantidad"`
	Ingresos float64 `json:"ingresos"`
}

type RankingCliente struct {
	Nombre  string  `json:"nombre"`
	Ordenes int     `json:"ordenes"`
	Gastado float64 `json:"gastado"`
}

type VentasCategoria struct {
	Categoria string  `json:"categoria"`
	Ingresos  float64 `json:"ingresos"`
}

const umbralStockBajo = 5

func redondear(v float64) float64 { return math.Round(v*100) / 100 }

// calcularResumen recorre las ordenes, productos y usuarios y saca las estadisticas.
// Las ordenes CANCELADAS no cuentan como ventas.
func calcularResumen(d DatosNegocio) Resumen {
	r := Resumen{
		GeneradoEn:             time.Now().Format(time.RFC3339),
		TotalUsuarios:          len(d.Usuarios),
		TotalProductos:         len(d.Productos),
		TotalOrdenes:           len(d.Ordenes),
		OrdenesPorEstado:       map[string]int{},
		TopProductos:           []RankingProducto{},
		TopClientes:            []RankingCliente{},
		VentasPorCategoria:     []VentasCategoria{},
		StockBajo:              []Producto{},
		ServiciosNoDisponibles: d.NoDisponibles,
	}
	if r.ServiciosNoDisponibles == nil {
		r.ServiciosNoDisponibles = []string{}
	}

	// Mapa productoId -> producto para conocer categoria e icono
	productos := map[string]Producto{}
	for _, p := range d.Productos {
		productos[p.ID] = p
		r.ValorInventario += p.Precio * float64(p.Stock)
		if p.Stock <= umbralStockBajo {
			r.StockBajo = append(r.StockBajo, p)
		}
	}

	porProducto := map[string]*RankingProducto{}
	porCliente := map[int]*RankingCliente{}
	porCategoria := map[string]float64{}
	ordenesValidas := 0

	for _, o := range d.Ordenes {
		r.OrdenesPorEstado[o.Estado]++
		if o.Estado == "CANCELADA" {
			continue
		}
		ordenesValidas++
		r.TotalVentas += o.Total

		c, ok := porCliente[o.UsuarioID]
		if !ok {
			c = &RankingCliente{Nombre: o.UsuarioNombre}
			porCliente[o.UsuarioID] = c
		}
		c.Ordenes++
		c.Gastado += o.Total

		for _, it := range o.Items {
			r.UnidadesVendidas += it.Cantidad
			rp, ok := porProducto[it.ProductoID]
			if !ok {
				rp = &RankingProducto{Nombre: it.ProductoNombre, Icono: productos[it.ProductoID].Icono}
				porProducto[it.ProductoID] = rp
			}
			rp.Cantidad += it.Cantidad
			rp.Ingresos += it.Subtotal

			categoria := productos[it.ProductoID].Categoria
			if categoria == "" {
				categoria = "Sin categoria"
			}
			porCategoria[categoria] += it.Subtotal
		}
	}

	if ordenesValidas > 0 {
		r.TicketPromedio = redondear(r.TotalVentas / float64(ordenesValidas))
	}
	r.TotalVentas = redondear(r.TotalVentas)
	r.ValorInventario = redondear(r.ValorInventario)

	for _, p := range porProducto {
		p.Ingresos = redondear(p.Ingresos)
		r.TopProductos = append(r.TopProductos, *p)
	}
	sort.Slice(r.TopProductos, func(i, j int) bool { return r.TopProductos[i].Cantidad > r.TopProductos[j].Cantidad })
	if len(r.TopProductos) > 5 {
		r.TopProductos = r.TopProductos[:5]
	}

	for _, c := range porCliente {
		c.Gastado = redondear(c.Gastado)
		r.TopClientes = append(r.TopClientes, *c)
	}
	sort.Slice(r.TopClientes, func(i, j int) bool { return r.TopClientes[i].Gastado > r.TopClientes[j].Gastado })
	if len(r.TopClientes) > 5 {
		r.TopClientes = r.TopClientes[:5]
	}

	for cat, total := range porCategoria {
		r.VentasPorCategoria = append(r.VentasPorCategoria, VentasCategoria{Categoria: cat, Ingresos: redondear(total)})
	}
	sort.Slice(r.VentasPorCategoria, func(i, j int) bool {
		return r.VentasPorCategoria[i].Ingresos > r.VentasPorCategoria[j].Ingresos
	})

	return r
}
