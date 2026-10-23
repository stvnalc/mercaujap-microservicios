package main

import (
	"fmt"
	"math"
	"sort"
	"time"
	_ "time/tzdata" // incluye las zonas horarias en el binario (la imagen alpine no las trae)
)

// Resumen es el reporte calculado a partir de los datos de los otros servicios.
type Resumen struct {
	GeneradoEn string `json:"generadoEn"`
	Desde      string `json:"desde"`
	Hasta      string `json:"hasta"`

	TotalClientes      int `json:"totalClientes"`
	ClientesConCompras int `json:"clientesConCompras"`
	TotalProductos     int `json:"totalProductos"`
	ProductosAgotados  int `json:"productosAgotados"`
	ProductosStockBajo int `json:"productosStockBajo"`

	TotalOrdenes        int            `json:"totalOrdenes"`
	OrdenesPorEstado    map[string]int `json:"ordenesPorEstado"`
	OrdenesPorDespachar int            `json:"ordenesPorDespachar"`

	TotalVentas      float64 `json:"totalVentas"` // con IVA, sin cancelados
	VentasNetas      float64 `json:"ventasNetas"` // sin IVA
	Impuestos        float64 `json:"impuestos"`
	CostoVentas      float64 `json:"costoVentas"`
	GananciaBruta    float64 `json:"gananciaBruta"`
	MargenBruto      float64 `json:"margenBruto"` // 0.25 = 25 %
	TicketPromedio   float64 `json:"ticketPromedio"`
	UnidadesVendidas int     `json:"unidadesVendidas"`
	ValorInventario  float64 `json:"valorInventario"`
	CostoInventario  float64 `json:"costoInventario"`

	// Mismo calculo para el periodo anterior de igual duracion (para comparar)
	VentasPeriodoAnterior  float64 `json:"ventasPeriodoAnterior"`
	OrdenesPeriodoAnterior int     `json:"ordenesPeriodoAnterior"`

	VentasPorDia        []VentaDia        `json:"ventasPorDia"`
	VentasPorMetodoPago []VentaMetodo     `json:"ventasPorMetodoPago"`
	VentasPorEntrega    []VentaMetodo     `json:"ventasPorEntrega"` // retiro, delivery y cada empresa de envio
	VentasPorCategoria  []VentasCategoria `json:"ventasPorCategoria"`
	TopProductos        []RankingProducto `json:"topProductos"`
	TopClientes         []RankingCliente  `json:"topClientes"`
	StockBajo           []Producto        `json:"stockBajo"`

	ServiciosNoDisponibles []string `json:"serviciosNoDisponibles"`
}

type VentaDia struct {
	Fecha   string  `json:"fecha"`
	Ventas  float64 `json:"ventas"`
	Ordenes int     `json:"ordenes"`
}

type VentaMetodo struct {
	Metodo  string  `json:"metodo"`
	Ordenes int     `json:"ordenes"`
	Total   float64 `json:"total"`
}

type RankingProducto struct {
	ProductoID string  `json:"productoId"`
	Nombre     string  `json:"nombre"`
	Categoria  string  `json:"categoria"`
	Cantidad   int     `json:"cantidad"`
	Ingresos   float64 `json:"ingresos"`
}

type RankingCliente struct {
	UsuarioID int     `json:"usuarioId"`
	Nombre    string  `json:"nombre"`
	Ordenes   int     `json:"ordenes"`
	Gastado   float64 `json:"gastado"`
}

type VentasCategoria struct {
	Categoria string  `json:"categoria"`
	Ingresos  float64 `json:"ingresos"`
	Unidades  int     `json:"unidades"`
}

// Periodo es un rango de fechas locales [Desde, Hasta] (ambas inclusive).
type Periodo struct {
	Desde, Hasta time.Time // a las 00:00 en la zona de la tienda
}

var zonaTienda = cargarZona()

func cargarZona() *time.Location {
	if loc, err := time.LoadLocation(env("TZ_TIENDA", "America/Caracas")); err == nil {
		return loc
	}
	return time.UTC
}

const formatoFecha = "2006-01-02"

// nuevoPeriodo interpreta ?desde= y ?hasta= (AAAA-MM-DD). Por defecto: los ultimos 30 dias.
func nuevoPeriodo(desde, hasta string) (Periodo, error) {
	hoy := time.Now().In(zonaTienda)
	fin := time.Date(hoy.Year(), hoy.Month(), hoy.Day(), 0, 0, 0, 0, zonaTienda)
	if hasta != "" {
		t, err := time.ParseInLocation(formatoFecha, hasta, zonaTienda)
		if err != nil {
			return Periodo{}, fmt.Errorf("fecha 'hasta' inválida, usa AAAA-MM-DD")
		}
		fin = t
	}
	inicio := fin.AddDate(0, 0, -29)
	if desde != "" {
		t, err := time.ParseInLocation(formatoFecha, desde, zonaTienda)
		if err != nil {
			return Periodo{}, fmt.Errorf("fecha 'desde' inválida, usa AAAA-MM-DD")
		}
		inicio = t
	}
	if inicio.After(fin) {
		return Periodo{}, fmt.Errorf("la fecha inicial no puede ser posterior a la final")
	}
	if fin.Sub(inicio) > 366*24*time.Hour {
		return Periodo{}, fmt.Errorf("el periodo máximo es de un año")
	}
	return Periodo{Desde: inicio, Hasta: fin}, nil
}

func (p Periodo) contiene(t time.Time) bool {
	t = t.In(zonaTienda)
	return !t.Before(p.Desde) && t.Before(p.Hasta.AddDate(0, 0, 1))
}

func (p Periodo) dias() int { return int(p.Hasta.Sub(p.Desde).Hours()/24+0.5) + 1 }

// anterior devuelve el periodo de la misma duracion justo antes de este.
func (p Periodo) anterior() Periodo {
	n := p.dias()
	return Periodo{Desde: p.Desde.AddDate(0, 0, -n), Hasta: p.Desde.AddDate(0, 0, -1)}
}

func redondear(v float64) float64 { return math.Round(v*100) / 100 }

// calcularResumen recorre los pedidos, productos y clientes y saca las estadisticas del periodo.
// Los pedidos CANCELADOS no cuentan como ventas.
func calcularResumen(d DatosNegocio, p Periodo) Resumen {
	r := Resumen{
		GeneradoEn:             time.Now().In(zonaTienda).Format(time.RFC3339),
		Desde:                  p.Desde.Format(formatoFecha),
		Hasta:                  p.Hasta.Format(formatoFecha),
		OrdenesPorEstado:       map[string]int{"PENDIENTE": 0, "PAGADA": 0, "ENVIADA": 0, "ENTREGADA": 0, "CANCELADA": 0},
		VentasPorDia:           []VentaDia{},
		VentasPorMetodoPago:    []VentaMetodo{},
		VentasPorEntrega:       []VentaMetodo{},
		VentasPorCategoria:     []VentasCategoria{},
		TopProductos:           []RankingProducto{},
		TopClientes:            []RankingCliente{},
		StockBajo:              []Producto{},
		ServiciosNoDisponibles: d.NoDisponibles,
	}
	if r.ServiciosNoDisponibles == nil {
		r.ServiciosNoDisponibles = []string{}
	}

	for _, u := range d.Usuarios {
		if u.Rol == "" || u.Rol == "cliente" {
			r.TotalClientes++
		}
	}

	// Mapa productoId -> producto para conocer categoria y costo
	productos := map[string]Producto{}
	for _, prod := range d.Productos {
		productos[prod.ID] = prod
		r.TotalProductos++
		r.ValorInventario += prod.Precio * float64(prod.Stock)
		r.CostoInventario += prod.Costo * float64(prod.Stock)
		if prod.Stock <= 0 {
			r.ProductosAgotados++
		} else if prod.Stock <= prod.StockMinimo {
			r.ProductosStockBajo++
		}
		if prod.Stock <= prod.StockMinimo {
			r.StockBajo = append(r.StockBajo, prod)
		}
	}
	sort.Slice(r.StockBajo, func(i, j int) bool { return r.StockBajo[i].Stock < r.StockBajo[j].Stock })

	// Un casillero por dia del periodo (aunque no haya ventas ese dia)
	indiceDia := map[string]int{}
	for t := p.Desde; !t.After(p.Hasta); t = t.AddDate(0, 0, 1) {
		indiceDia[t.Format(formatoFecha)] = len(r.VentasPorDia)
		r.VentasPorDia = append(r.VentasPorDia, VentaDia{Fecha: t.Format(formatoFecha)})
	}

	porProducto := map[string]*RankingProducto{}
	porCliente := map[int]*RankingCliente{}
	porCategoria := map[string]*VentasCategoria{}
	porMetodo := map[string]*VentaMetodo{}
	porEntrega := map[string]*VentaMetodo{}
	ordenesValidas := 0
	anterior := p.anterior()

	for _, o := range d.Ordenes {
		if o.Estado == "PENDIENTE" || o.Estado == "PAGADA" {
			r.OrdenesPorDespachar++ // pendientes de despacho, sin importar la fecha
		}
		if anterior.contiene(o.Fecha) && o.Estado != "CANCELADA" {
			r.VentasPeriodoAnterior += o.Total
			r.OrdenesPeriodoAnterior++
		}
		if !p.contiene(o.Fecha) {
			continue
		}
		r.TotalOrdenes++
		r.OrdenesPorEstado[o.Estado]++
		if o.Estado == "CANCELADA" {
			continue
		}
		ordenesValidas++
		r.TotalVentas += o.Total
		r.VentasNetas += o.Subtotal
		r.Impuestos += o.Impuesto

		if i, ok := indiceDia[o.Fecha.In(zonaTienda).Format(formatoFecha)]; ok {
			r.VentasPorDia[i].Ventas += o.Total
			r.VentasPorDia[i].Ordenes++
		}

		metodo := o.MetodoPago
		if metodo == "" {
			metodo = "EFECTIVO"
		}
		m, ok := porMetodo[metodo]
		if !ok {
			m = &VentaMetodo{Metodo: metodo}
			porMetodo[metodo] = m
		}
		m.Ordenes++
		m.Total += o.Total

		entrega := o.MetodoEntregaNombre
		if entrega == "" {
			entrega = "Sin especificar"
		}
		if o.EmpresaEnvioNombre != "" {
			entrega += " · " + o.EmpresaEnvioNombre
		}
		e, ok := porEntrega[entrega]
		if !ok {
			e = &VentaMetodo{Metodo: entrega}
			porEntrega[entrega] = e
		}
		e.Ordenes++
		e.Total += o.Total

		c, ok := porCliente[o.UsuarioID]
		if !ok {
			c = &RankingCliente{UsuarioID: o.UsuarioID, Nombre: o.UsuarioNombre}
			porCliente[o.UsuarioID] = c
		}
		c.Ordenes++
		c.Gastado += o.Total

		for _, it := range o.Items {
			r.UnidadesVendidas += it.Cantidad
			prod := productos[it.ProductoID]
			r.CostoVentas += prod.Costo * float64(it.Cantidad)

			rp, ok := porProducto[it.ProductoID]
			if !ok {
				rp = &RankingProducto{ProductoID: it.ProductoID, Nombre: it.ProductoNombre, Categoria: prod.Categoria}
				porProducto[it.ProductoID] = rp
			}
			rp.Cantidad += it.Cantidad
			rp.Ingresos += it.Subtotal

			categoria := prod.Categoria
			if categoria == "" {
				categoria = "Sin categoría"
			}
			vc, ok := porCategoria[categoria]
			if !ok {
				vc = &VentasCategoria{Categoria: categoria}
				porCategoria[categoria] = vc
			}
			vc.Ingresos += it.Subtotal
			vc.Unidades += it.Cantidad
		}
	}

	if ordenesValidas > 0 {
		r.TicketPromedio = redondear(r.TotalVentas / float64(ordenesValidas))
	}
	r.ClientesConCompras = len(porCliente)
	r.GananciaBruta = redondear(r.VentasNetas - r.CostoVentas)
	if r.VentasNetas > 0 {
		r.MargenBruto = math.Round(r.GananciaBruta/r.VentasNetas*1000) / 1000
	}
	r.TotalVentas = redondear(r.TotalVentas)
	r.VentasNetas = redondear(r.VentasNetas)
	r.Impuestos = redondear(r.Impuestos)
	r.CostoVentas = redondear(r.CostoVentas)
	r.ValorInventario = redondear(r.ValorInventario)
	r.CostoInventario = redondear(r.CostoInventario)
	r.VentasPeriodoAnterior = redondear(r.VentasPeriodoAnterior)
	for i := range r.VentasPorDia {
		r.VentasPorDia[i].Ventas = redondear(r.VentasPorDia[i].Ventas)
	}

	for _, rp := range porProducto {
		rp.Ingresos = redondear(rp.Ingresos)
		r.TopProductos = append(r.TopProductos, *rp)
	}
	sort.Slice(r.TopProductos, func(i, j int) bool {
		if r.TopProductos[i].Ingresos != r.TopProductos[j].Ingresos {
			return r.TopProductos[i].Ingresos > r.TopProductos[j].Ingresos
		}
		return r.TopProductos[i].Nombre < r.TopProductos[j].Nombre
	})
	if len(r.TopProductos) > 5 {
		r.TopProductos = r.TopProductos[:5]
	}

	for _, c := range porCliente {
		c.Gastado = redondear(c.Gastado)
		r.TopClientes = append(r.TopClientes, *c)
	}
	sort.Slice(r.TopClientes, func(i, j int) bool {
		if r.TopClientes[i].Gastado != r.TopClientes[j].Gastado {
			return r.TopClientes[i].Gastado > r.TopClientes[j].Gastado
		}
		return r.TopClientes[i].Nombre < r.TopClientes[j].Nombre
	})
	if len(r.TopClientes) > 5 {
		r.TopClientes = r.TopClientes[:5]
	}

	for _, vc := range porCategoria {
		vc.Ingresos = redondear(vc.Ingresos)
		r.VentasPorCategoria = append(r.VentasPorCategoria, *vc)
	}
	sort.Slice(r.VentasPorCategoria, func(i, j int) bool {
		return r.VentasPorCategoria[i].Ingresos > r.VentasPorCategoria[j].Ingresos
	})

	for _, m := range porMetodo {
		m.Total = redondear(m.Total)
		r.VentasPorMetodoPago = append(r.VentasPorMetodoPago, *m)
	}
	sort.Slice(r.VentasPorMetodoPago, func(i, j int) bool { return r.VentasPorMetodoPago[i].Total > r.VentasPorMetodoPago[j].Total })

	for _, e := range porEntrega {
		e.Total = redondear(e.Total)
		r.VentasPorEntrega = append(r.VentasPorEntrega, *e)
	}
	sort.Slice(r.VentasPorEntrega, func(i, j int) bool { return r.VentasPorEntrega[i].Ordenes > r.VentasPorEntrega[j].Ordenes })

	return r
}
