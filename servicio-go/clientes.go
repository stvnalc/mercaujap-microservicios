package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"
)

// COMUNICACION ENTRE MICROSERVICIOS:
// El servicio Go le pide los datos a los otros tres servicios por HTTP.

var clienteHTTP = &http.Client{Timeout: 5 * time.Second}

// obtenerJSON hace un GET y convierte la respuesta JSON en la estructura "destino".
func obtenerJSON(url string, destino any) error {
	resp, err := clienteHTTP.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("%s respondio %d", url, resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(destino)
}

// DatosNegocio agrupa lo que se obtuvo de cada servicio.
type DatosNegocio struct {
	Usuarios      []Usuario
	Productos     []Producto
	Ordenes       []Orden
	NoDisponibles []string // servicios que no respondieron
}

// obtenerDatos consulta los 3 servicios AL MISMO TIEMPO usando goroutines.
// En vez de esperar uno por uno, se lanzan en paralelo y se espera a que terminen todos.
func obtenerDatos(cfg Config) DatosNegocio {
	var datos DatosNegocio
	var wg sync.WaitGroup
	var mu sync.Mutex // protege NoDisponibles, que lo escriben varias goroutines

	consultar := func(nombre, url string, destino any) {
		defer wg.Done()
		if err := obtenerJSON(url, destino); err != nil {
			mu.Lock()
			datos.NoDisponibles = append(datos.NoDisponibles, nombre)
			mu.Unlock()
		}
	}

	wg.Add(3)
	go consultar("usuarios (Python)", cfg.UsuariosURL+"/usuarios", &datos.Usuarios)
	go consultar("productos (Node)", cfg.ProductosURL+"/productos", &datos.Productos)
	go consultar("ordenes (Java)", cfg.OrdenesURL+"/ordenes", &datos.Ordenes)
	wg.Wait()

	return datos
}
