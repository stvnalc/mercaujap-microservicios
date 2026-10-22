package main

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"
)

// generarCSV arma un archivo CSV por secciones. Usa ";" y BOM UTF-8
// para que Excel en espanol lo abra con columnas y acentos correctos.
func generarCSV(rep Reporte, r Resumen) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteString("\xEF\xBB\xBF") // BOM UTF-8
	w := csv.NewWriter(&buf)
	w.Comma = ';'

	num := func(v float64) string { return strconv.FormatFloat(v, 'f', 2, 64) }
	ent := strconv.Itoa

	filas := [][]string{
		{rep.Titulo},
		{"Periodo", r.Desde + " a " + r.Hasta},
		{"Generado por", rep.GeneradoPor},
		{"Generado el", rep.CreatedAt.In(zonaTienda).Format("02/01/2006 15:04")},
		{},
		{"INDICADORES"},
		{"Ventas totales (con IVA)", num(r.TotalVentas)},
		{"Ventas netas", num(r.VentasNetas)},
		{"IVA", num(r.Impuestos)},
		{"Costo de ventas", num(r.CostoVentas)},
		{"Ganancia bruta", num(r.GananciaBruta)},
		{"Margen bruto (%)", num(r.MargenBruto * 100)},
		{"Pedidos", ent(r.TotalOrdenes)},
		{"Ticket promedio", num(r.TicketPromedio)},
		{"Unidades vendidas", ent(r.UnidadesVendidas)},
		{"Valor del inventario", num(r.ValorInventario)},
		{},
		{"VENTAS POR DIA"},
		{"Fecha", "Pedidos", "Ventas"},
	}
	for _, d := range r.VentasPorDia {
		filas = append(filas, []string{d.Fecha, ent(d.Ordenes), num(d.Ventas)})
	}
	filas = append(filas, []string{}, []string{"PRODUCTOS MAS VENDIDOS"}, []string{"Producto", "Categoria", "Unidades", "Ingresos"})
	for _, p := range r.TopProductos {
		filas = append(filas, []string{p.Nombre, p.Categoria, ent(p.Cantidad), num(p.Ingresos)})
	}
	filas = append(filas, []string{}, []string{"VENTAS POR CATEGORIA"}, []string{"Categoria", "Unidades", "Ingresos"})
	for _, c := range r.VentasPorCategoria {
		filas = append(filas, []string{c.Categoria, ent(c.Unidades), num(c.Ingresos)})
	}
	filas = append(filas, []string{}, []string{"MEJORES CLIENTES"}, []string{"Cliente", "Pedidos", "Total"})
	for _, c := range r.TopClientes {
		filas = append(filas, []string{c.Nombre, ent(c.Ordenes), num(c.Gastado)})
	}
	filas = append(filas, []string{}, []string{"METODOS DE PAGO"}, []string{"Metodo", "Pedidos", "Total"})
	for _, m := range r.VentasPorMetodoPago {
		filas = append(filas, []string{m.Metodo, ent(m.Ordenes), num(m.Total)})
	}
	filas = append(filas, []string{}, []string{"PRODUCTOS PARA REPONER"}, []string{"SKU", "Producto", "Stock", "Stock minimo"})
	for _, p := range r.StockBajo {
		filas = append(filas, []string{p.Sku, p.Nombre, ent(p.Stock), ent(p.StockMinimo)})
	}

	if err := w.WriteAll(filas); err != nil {
		return nil, fmt.Errorf("csv: %w", err)
	}
	return buf.Bytes(), nil
}
