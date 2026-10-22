package com.ujap.ordenes.controller;

import com.ujap.ordenes.dto.CambiarEstadoRequest;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.model.Orden;
import com.ujap.ordenes.service.OrdenService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin
public class OrdenController {

    private final OrdenService service;

    public OrdenController(OrdenService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "servicio", "ordenes", "lenguaje", "Java", "bd", "PostgreSQL");
    }

    @GetMapping("/ordenes")
    public List<Orden> listar(@RequestParam(required = false) Long usuarioId) {
        return service.listar(usuarioId);
    }

    @GetMapping("/ordenes/{id}")
    public Orden obtener(@PathVariable Long id) {
        return service.obtener(id);
    }

    @PostMapping("/ordenes")
    public ResponseEntity<Orden> crear(@Valid @RequestBody CrearOrdenRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(req));
    }

    @PatchMapping("/ordenes/{id}/estado")
    public Orden cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoRequest req) {
        return service.cambiarEstado(id, req.estado());
    }

    @DeleteMapping("/ordenes/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
