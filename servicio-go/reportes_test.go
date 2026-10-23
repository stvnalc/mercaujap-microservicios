package main

import (
	"testing"
	"time"
)

// Pruebas unitarias del calculo de reportes:  go test ./...
func TestCalcularResumen(t *testing.T) {
	periodo, err := nuevoPeriodo("2026-10-01", "2026-10-10")
	if err != nil {
		t.Fatal(err)
	}
	dia := func(d int) time.Time { return time.Date(2026, 10, d, 12, 0, 0, 0, zonaTienda) }

	datos := DatosNegocio{
		Usuarios: []Usuario{{ID: 1, Nombre: "Ana", Rol: "cliente"}, {ID: 2, Nombre: "Admin", Rol: "admin"}},
		Productos: []Producto{
			{ID: "p1", Nombre: "Mouse", Categoria: "Periféricos", Precio: 10, Costo: 6, Stock: 3, StockMinimo: 5},
			{ID: "p2", Nombre: "Monitor", Categoria: "Monitores", Precio: 100, Costo: 70, Stock: 10, StockMinimo: 2},
		},
		Ordenes: []Orden{
			{ID: 1, UsuarioID: 1, UsuarioNombre: "Ana", Estado: "ENTREGADA", Fecha: dia(2), MetodoPago: "PAGO_MOVIL",
				MetodoEntregaNombre: "Envío nacional", EmpresaEnvioNombre: "MRW",
				Subtotal: 120, Impuesto: 19.2, Total: 139.2,
				Items: []OrdenItem{{ProductoID: "p1", ProductoNombre: "Mouse", Cantidad: 2, Subtotal: 20}, {ProductoID: "p2", ProductoNombre: "Monitor", Cantidad: 1, Subtotal: 100}}},
			{ID: 2, UsuarioID: 1, UsuarioNombre: "Ana", Estado: "CANCELADA", Fecha: dia(3), Subtotal: 100, Impuesto: 16, Total: 116,
				Items: []OrdenItem{{ProductoID: "p2", Cantidad: 1, Subtotal: 100}}},
			{ID: 3, UsuarioID: 1, UsuarioNombre: "Ana", Estado: "PAGADA", Fecha: dia(20), Subtotal: 10, Impuesto: 1.6, Total: 11.6,
				Items: []OrdenItem{{ProductoID: "p1", Cantidad: 1, Subtotal: 10}}}, // fuera del periodo
		},
	}

	r := calcularResumen(datos, periodo)

	if r.TotalClientes != 1 {
		t.Errorf("clientes: esperaba 1 (el admin no cuenta), obtuve %d", r.TotalClientes)
	}
	if r.TotalOrdenes != 2 || r.OrdenesPorEstado["CANCELADA"] != 1 {
		t.Errorf("pedidos del periodo: %d, cancelados %d", r.TotalOrdenes, r.OrdenesPorEstado["CANCELADA"])
	}
	if r.TotalVentas != 139.2 {
		t.Errorf("ventas: esperaba 139.2 (sin cancelados), obtuve %v", r.TotalVentas)
	}
	if r.GananciaBruta != 38 { // 120 - (2*6 + 70)
		t.Errorf("ganancia bruta: esperaba 38, obtuve %v", r.GananciaBruta)
	}
	if r.UnidadesVendidas != 3 {
		t.Errorf("unidades: esperaba 3, obtuve %d", r.UnidadesVendidas)
	}
	if len(r.VentasPorDia) != 10 || r.VentasPorDia[1].Ventas != 139.2 {
		t.Errorf("ventas por dia incorrectas: %+v", r.VentasPorDia)
	}
	if len(r.StockBajo) != 1 || r.StockBajo[0].ID != "p1" {
		t.Errorf("stock bajo: esperaba solo el mouse, obtuve %+v", r.StockBajo)
	}
	if len(r.VentasPorEntrega) != 1 || r.VentasPorEntrega[0].Metodo != "Envío nacional · MRW" || r.VentasPorEntrega[0].Ordenes != 1 {
		t.Errorf("ventas por entrega: esperaba solo el envío por MRW, obtuve %+v", r.VentasPorEntrega)
	}
	if r.OrdenesPorDespachar != 1 {
		t.Errorf("por despachar: esperaba 1, obtuve %d", r.OrdenesPorDespachar)
	}
	if len(r.TopProductos) == 0 || r.TopProductos[0].Nombre != "Monitor" {
		t.Errorf("top producto por ingresos: %+v", r.TopProductos)
	}
}

func TestPeriodoInvalido(t *testing.T) {
	if _, err := nuevoPeriodo("2026-10-10", "2026-10-01"); err == nil {
		t.Error("esperaba error con desde > hasta")
	}
	if _, err := nuevoPeriodo("10/10/2026", ""); err == nil {
		t.Error("esperaba error con formato de fecha invalido")
	}
}
