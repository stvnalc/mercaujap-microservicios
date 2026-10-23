package com.ujap.ordenes.controller;

import com.ujap.ordenes.client.ServiciosClient;
import com.ujap.ordenes.dto.CambiarEstadoRequest;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.model.Bancos;
import com.ujap.ordenes.model.EmpresaEnvio;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.MetodoEntrega;
import com.ujap.ordenes.model.MetodoPago;
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
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin(exposedHeaders = "X-Total-Count")
public class OrdenController {

    private final OrdenService service;
    private final ServiciosClient servicios;

    public OrdenController(OrdenService service, ServiciosClient servicios) {
        this.service = service;
        this.servicios = servicios;
    }

    /** El API Gateway envia el nombre del usuario que inicio sesion (%-codificado). */
    private static String usuario(String cabecera) {
        if (cabecera == null || cabecera.isBlank()) return "Sistema";
        return URLDecoder.decode(cabecera, StandardCharsets.UTF_8);
    }

    private static Long id(String cabecera) {
        try {
            return cabecera == null ? null : Long.valueOf(cabecera);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        return Map.of("status", "ok", "servicio", "ordenes", "lenguaje", "Java", "bd", "PostgreSQL",
                "pedidos", service.contar());
    }

    /** Opciones para los formularios: metodos de pago (y que dato pide cada uno), bancos y empresas de envio. */
    @GetMapping("/ordenes/catalogos")
    public Map<String, Object> catalogos() {
        Map<String, Object> c = new LinkedHashMap<>();
        c.put("metodosPago", Arrays.stream(MetodoPago.values()).map(m -> {
            Map<String, Object> d = new LinkedHashMap<>();
            d.put("valor", m.name());
            d.put("nombre", m.getNombre());
            d.put("pideReferencia", m.requiereReferencia());
            d.put("referenciaSoloNumeros", m.soloNumeros());
            d.put("pideBanco", m.requiereBanco());
            return d;
        }).toList());
        c.put("metodosEntrega", Arrays.stream(MetodoEntrega.values())
                .map(m -> Map.of("valor", m.name(), "nombre", m.getNombre(), "usaDireccion", m.usaDireccion())).toList());
        c.put("empresasEnvio", Arrays.stream(EmpresaEnvio.values())
                .map(e -> Map.of("valor", e.name(), "nombre", e.getNombre())).toList());
        c.put("bancos", Bancos.LISTA.entrySet().stream()
                .map(b -> Map.of("codigo", b.getKey(), "nombre", b.getValue())).toList());
        return c;
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
                                       @RequestHeader(value = "X-Usuario-Id", required = false) String usuarioId,
                                       @RequestHeader(value = "X-Usuario-Nombre", required = false) String usuario) {
        Orden orden = service.crear(req, usuario(usuario));
        servicios.publicarEvento("creado", orden.getId(),
                "Registró el pedido " + orden.getCodigo() + " de " + orden.getUsuarioNombre(), id(usuarioId), usuario(usuario));
        return ResponseEntity.status(HttpStatus.CREATED).body(orden);
    }

    @PatchMapping("/ordenes/{id}/estado")
    public Orden cambiarEstado(@PathVariable Long id, @Valid @RequestBody CambiarEstadoRequest req,
                               @RequestHeader(value = "X-Usuario-Id", required = false) String usuarioId,
                               @RequestHeader(value = "X-Usuario-Nombre", required = false) String usuario) {
        Orden orden = service.cambiarEstado(id, req, usuario(usuario));
        String codigo = orden.getCodigo();
        String mensaje = switch (orden.getEstado()) {
            case PAGADA -> "Confirmó el pago de " + codigo + " (" + orden.getMetodoPagoNombre() + ")";
            case ENVIADA -> orden.getEmpresaEnvio() != null
                    ? "Despachó " + codigo + " por " + orden.getEmpresaEnvioNombre()
                    : "Envió " + codigo + " por delivery";
            case ENTREGADA -> "Marcó " + codigo + " como entregado";
            case CANCELADA -> "Canceló el pedido " + codigo;
            case PENDIENTE -> "Actualizó " + codigo;
        };
        servicios.publicarEvento("estado", orden.getId(), mensaje, id(usuarioId), usuario(usuario));
        return orden;
    }

    @DeleteMapping("/ordenes/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id,
                                         @RequestHeader(value = "X-Usuario-Id", required = false) String usuarioId,
                                         @RequestHeader(value = "X-Usuario-Nombre", required = false) String usuario) {
        String codigo = service.obtener(id).getCodigo();
        service.eliminar(id);
        servicios.publicarEvento("eliminado", id, "Eliminó el pedido " + codigo, id(usuarioId), usuario(usuario));
        return ResponseEntity.noContent().build();
    }
}
