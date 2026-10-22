package com.ujap.ordenes.controller;

import com.ujap.ordenes.dto.CambiarEstadoRequest;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.Orden;
import com.ujap.ordenes.service.OrdenService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(exposedHeaders = "X-Total-Count")
public class OrdenController {

    private final OrdenService service;

    public OrdenController(OrdenService service) {
        this.service = service;
    }

    /** El API Gateway envia el nombre del usuario que inicio sesion (%-codificado). */
    private static String usuario(String cabecera) {
        if (cabecera == null || cabecera.isBlank()) return "Sistema";
        return URLDecoder.decode(cabecera, StandardCharsets.UTF_8);
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "servicio", "ordenes", "lenguaje", "Java", "bd", "PostgreSQL",
                "pedidos", service.contar());
    }

    @GetMapping("/ordenes")
    public ResponseEntity<List<Orden>> listar(
            @RequestParam(required = false) EstadoOrden estado,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) String q) {
        List<Orden> ordenes = service.listar(estado, usuarioId, desde, hasta, q);
        return ResponseEntity.ok().header("X-Total-Count", String.valueOf(ordenes.size())).body(ordenes);
    }

    @GetMapping("/ordenes/{id}")
    public Orden obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping("/ordenes")
    public ResponseEntity<Orden> crear(@Valid @RequestBody CrearOrdenRequest req,
                                       @RequestHeader(value = "X-Usuario-Nombre", required = false) String usuario) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(req, usuario(usuario)));
    }

    @PatchMapping("/ordenes/{id}/estado")
    public Orden cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoRequest req,
                               @RequestHeader(value = "X-Usuario-Nombre", required = false) String usuario) {
        return service.cambiarEstado(id, req.estado(), req.nota(), usuario(usuario));
    }

    @DeleteMapping("/ordenes/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
