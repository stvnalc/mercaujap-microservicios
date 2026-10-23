package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
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

// publicarEvento avisa a servicio-node para que reenvie el cambio por WebSocket.
// Corre en una goroutine: la respuesta al usuario no espera por esto.
func publicarEvento(cfg Config, c *gin.Context, accion string, id uint, mensaje string) {
	var autor map[string]any
	if uid, err := strconv.Atoi(c.GetHeader("X-Usuario-Id")); err == nil {
		autor = map[string]any{"id": uid, "nombre": usuarioDe(c)}
	}
	cuerpo, _ := json.Marshal(map[string]any{"tema": "reportes", "accion": accion, "id": id, "mensaje": mensaje, "usuario": autor})
	go func() {
		resp, err := clienteHTTP.Post(cfg.EventosURL, "application/json", bytes.NewReader(cuerpo))
		if err != nil {
			log.Printf("[go] No se pudo publicar el evento en tiempo real: %v", err)
			return
		}
		resp.Body.Close()
	}()
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
	go consultar("Clientes", cfg.UsuariosURL+"/usuarios", &datos.Usuarios)
	go consultar("Productos", cfg.ProductosURL+"/productos", &datos.Productos)
	go consultar("Pedidos", cfg.OrdenesURL+"/ordenes", &datos.Ordenes)
	wg.Wait()

	return datos
}
