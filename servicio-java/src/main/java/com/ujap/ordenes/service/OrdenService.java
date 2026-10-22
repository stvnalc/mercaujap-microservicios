package com.ujap.ordenes.service;

import com.ujap.ordenes.client.ServiciosClient;
import com.ujap.ordenes.client.ServiciosClient.ProductoDto;
import com.ujap.ordenes.client.ServiciosClient.UsuarioDto;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.exception.ErrorNegocio;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.MetodoPago;
import com.ujap.ordenes.model.Orden;
import com.ujap.ordenes.model.OrdenItem;
import com.ujap.ordenes.repository.OrdenFiltros;
import com.ujap.ordenes.repository.OrdenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Logica de negocio de los pedidos. */
@Service
public class OrdenService {

    private final OrdenRepository repo;
    private final ServiciosClient servicios;
    private final BigDecimal iva;
    private final ZoneId zona;

    public OrdenService(OrdenRepository repo, ServiciosClient servicios,
                        @Value("${tienda.iva:0.16}") BigDecimal iva,
                        @Value("${tienda.zona-horaria:America/Caracas}") String zona) {
        this.repo = repo;
        this.servicios = servicios;
        this.iva = iva;
        this.zona = ZoneId.of(zona);
    }

    /** desde/hasta son fechas locales de la tienda (hasta es inclusivo). */
    public List<Orden> listar(EstadoOrden estado, Long usuarioId, LocalDate desde, LocalDate hasta, String q) {
        Instant inicio = desde == null ? null : desde.atStartOfDay(zona).toInstant();
        Instant fin = hasta == null ? null : hasta.plusDays(1).atStartOfDay(zona).toInstant();
        return repo.findAll(OrdenFiltros.de(estado, usuarioId, inicio, fin, q),
                Sort.by(Sort.Direction.DESC, "fecha", "id"));
    }

    public Orden obtener(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.NOT_FOUND, "El pedido " + id + " no existe"));
    }

    public Orden crear(CrearOrdenRequest req, String usuarioActual) {
        return crear(req, usuarioActual, Instant.now());
    }

    /**
     * Crear un pedido:
     *  1. Pregunta a Python si el cliente existe y esta activo.
     *  2. Pregunta a Node el precio y stock de cada producto.
     *  3. Guarda el pedido (PENDIENTE) para obtener su codigo PED-000123.
     *  4. Le pide a Node que descuente el stock (queda como movimiento "Venta PED-000123").
     *     Si algo falla a mitad de camino, devuelve el stock ya descontado y borra el pedido
     *     (compensacion, porque cada servicio tiene su propia base de datos).
     */
    public Orden crear(CrearOrdenRequest req, String usuarioActual, Instant fecha) {
        UsuarioDto cliente = servicios.obtenerUsuario(req.usuarioId());
        if (Boolean.FALSE.equals(cliente.activo())) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El cliente " + cliente.nombre() + " está desactivado");
        }

        // Si el mismo producto viene repetido, sumamos las cantidades
        Map<String, Integer> cantidades = new LinkedHashMap<>();
        for (CrearOrdenRequest.Item item : req.items()) {
            cantidades.merge(item.productoId(), item.cantidad(), Integer::sum);
        }

        Orden orden = new Orden();
        orden.setUsuarioId(cliente.id());
        orden.setUsuarioNombre(cliente.nombre());
        orden.setUsuarioEmail(cliente.email());
        orden.setUsuarioDocumento(cliente.documento());
        orden.setDireccionEnvio(textoONulo(req.direccionEnvio()) != null ? req.direccionEnvio().trim() : cliente.direccion());
        orden.setMetodoPago(req.metodoPago() == null ? MetodoPago.EFECTIVO : req.metodoPago());
        orden.setNotas(textoONulo(req.notas()));
        orden.setCreadoPor(usuarioActual);
        orden.setFecha(fecha);

        BigDecimal subtotal = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> e : cantidades.entrySet()) {
            ProductoDto producto = servicios.obtenerProducto(e.getKey());
            int cantidad = e.getValue();
            if (Boolean.FALSE.equals(producto.activo())) {
                throw new ErrorNegocio(HttpStatus.BAD_REQUEST, producto.nombre() + " no está disponible para la venta");
            }
            if (producto.stock() == null || producto.stock() < cantidad) {
                throw new ErrorNegocio(HttpStatus.CONFLICT,
                        "Stock insuficiente de " + producto.nombre() + " (disponible: " + producto.stock() + ")");
            }
            OrdenItem item = new OrdenItem();
            item.setProductoId(e.getKey());
            item.setSku(producto.sku());
            item.setProductoNombre(producto.nombre());
            item.setPrecioUnitario(producto.precio());
            item.setCantidad(cantidad);
            item.setSubtotal(producto.precio().multiply(BigDecimal.valueOf(cantidad)).setScale(2, RoundingMode.HALF_UP));
            orden.agregarItem(item);
            subtotal = subtotal.add(item.getSubtotal());
        }
        BigDecimal impuesto = subtotal.multiply(iva).setScale(2, RoundingMode.HALF_UP);
        orden.setSubtotal(subtotal);
        orden.setImpuesto(impuesto);
        orden.setTotal(subtotal.add(impuesto));
        orden.registrarEstado(EstadoOrden.PENDIENTE, fecha, "Pedido registrado", usuarioActual);

        orden = repo.save(orden);
        orden.setCodigo(String.format("PED-%06d", orden.getId()));
        orden = repo.save(orden);

        List<OrdenItem> descontados = new ArrayList<>();
        try {
            for (OrdenItem item : orden.getItems()) {
                servicios.ajustarStock(item.getProductoId(), -item.getCantidad(), "Venta", orden.getCodigo(), usuarioActual, fecha);
                descontados.add(item);
            }
            return orden;
        } catch (RuntimeException ex) {
            devolverStock(descontados, "Reverso de venta fallida", orden.getCodigo(), usuarioActual, fecha);
            repo.delete(orden);
            throw ex;
        }
    }

    public Orden cambiarEstado(Long id, EstadoOrden nuevo, String nota, String usuarioActual) {
        return cambiarEstado(id, nuevo, nota, usuarioActual, Instant.now());
    }

    public Orden cambiarEstado(Long id, EstadoOrden nuevo, String nota, String usuarioActual, Instant cuando) {
        Orden orden = obtener(id);
        EstadoOrden actual = orden.getEstado();
        if (actual == nuevo) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "El pedido ya está en estado " + nuevo);
        }
        if (!actual.puedePasarA(nuevo)) {
            throw new ErrorNegocio(HttpStatus.CONFLICT,
                    "No se puede pasar de " + actual + " a " + nuevo + ". Permitidos: " + (actual.siguientes().isEmpty() ? "ninguno (estado final)" : actual.siguientes()));
        }
        if (nuevo == EstadoOrden.CANCELADA) {
            devolverStock(orden.getItems(), "Pedido cancelado", orden.getCodigo(), usuarioActual, cuando);
        }
        orden.registrarEstado(nuevo, cuando, textoONulo(nota), usuarioActual);
        return repo.save(orden);
    }

    /** Solo se pueden eliminar pedidos cancelados (el stock ya fue devuelto). */
    public void eliminar(Long id) {
        Orden orden = obtener(id);
        if (orden.getEstado() != EstadoOrden.CANCELADA) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "Solo se pueden eliminar pedidos cancelados. Cancélalo primero");
        }
        repo.delete(orden);
    }

    public long contar() {
        return repo.count();
    }

    private void devolverStock(List<OrdenItem> items, String motivo, String referencia, String usuario, Instant fecha) {
        for (OrdenItem item : items) {
            try {
                servicios.ajustarStock(item.getProductoId(), item.getCantidad(), motivo, referencia, usuario, fecha);
            } catch (ErrorNegocio e) {
                // El producto pudo haber sido eliminado del catalogo; seguimos con los demas
                System.err.println("[java] No se pudo devolver stock de " + item.getProductoId() + ": " + e.getMessage());
            }
        }
    }

    private static String textoONulo(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
