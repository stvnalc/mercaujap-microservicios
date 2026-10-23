package com.ujap.ordenes.service;

import com.ujap.ordenes.client.ServiciosClient;
import com.ujap.ordenes.client.ServiciosClient.ProductoDto;
import com.ujap.ordenes.client.ServiciosClient.UsuarioDto;
import com.ujap.ordenes.dto.CambiarEstadoRequest;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.exception.ErrorNegocio;
import com.ujap.ordenes.model.Bancos;
import com.ujap.ordenes.model.EmpresaEnvio;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.MetodoEntrega;
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
        MetodoEntrega entrega = req.metodoEntrega() == null ? MetodoEntrega.ENVIO_NACIONAL : req.metodoEntrega();
        orden.setMetodoEntrega(entrega);
        if (entrega.usaDireccion()) {
            String direccion = textoONulo(req.direccionEnvio()) != null ? req.direccionEnvio().trim() : textoONulo(cliente.direccion());
            if (direccion == null) {
                throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Indica la dirección de envío: el cliente no tiene una registrada");
            }
            orden.setDireccionEnvio(direccion);
        }
        // La empresa de encomiendas preferida se guarda desde ya; al despachar se confirma con el numero de guia
        if (entrega == MetodoEntrega.ENVIO_NACIONAL) orden.setEmpresaEnvio(req.empresaEnvio());
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
        orden.registrarEstado(EstadoOrden.PENDIENTE, fecha, entrega.getNombre() + " · " + orden.getMetodoPagoNombre(), null, usuarioActual);

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

    public Orden cambiarEstado(Long id, CambiarEstadoRequest req, String usuarioActual) {
        return cambiarEstado(id, req, usuarioActual, Instant.now());
    }

    /**
     * Cambia el estado validando la maquina de estados y los datos que pide cada paso:
     *   PAGADA    -> metodo de pago + (banco) + numero de referencia segun el metodo
     *   ENVIADA   -> empresa de encomiendas + numero de guia (envio nacional)
     *   ENTREGADA -> quien recibio (opcional)
     *   CANCELADA -> motivo obligatorio; el stock vuelve al inventario
     */
    public Orden cambiarEstado(Long id, CambiarEstadoRequest req, String usuarioActual, Instant cuando) {
        Orden orden = obtener(id);
        EstadoOrden actual = orden.getEstado();
        EstadoOrden nuevo = req.estado();
        MetodoEntrega entrega = orden.getMetodoEntrega();
        if (actual == nuevo) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "El pedido ya está en estado " + nuevo);
        }
        if (!actual.puedePasarA(nuevo, entrega)) {
            var permitidos = actual.siguientes(entrega);
            throw new ErrorNegocio(HttpStatus.CONFLICT,
                    "No se puede pasar de " + actual + " a " + nuevo + ". Permitidos: " + (permitidos.isEmpty() ? "ninguno (estado final)" : permitidos));
        }

        String detalle = switch (nuevo) {
            case PAGADA -> registrarPago(orden, req);
            case ENVIADA -> registrarEnvio(orden, req);
            case ENTREGADA -> registrarEntrega(orden, req);
            case CANCELADA -> {
                if (textoONulo(req.nota()) == null) {
                    throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Indica el motivo de la cancelación");
                }
                devolverStock(orden.getItems(), "Pedido cancelado", orden.getCodigo(), usuarioActual, cuando);
                yield "Stock devuelto al inventario";
            }
            case PENDIENTE -> null;
        };
        orden.registrarEstado(nuevo, cuando, detalle, textoONulo(req.nota()), usuarioActual);
        return repo.save(orden);
    }

    private String registrarPago(Orden orden, CambiarEstadoRequest req) {
        // El cliente puede terminar pagando con un metodo distinto al que dijo al hacer el pedido
        MetodoPago metodo = req.metodoPago() != null ? req.metodoPago() : orden.getMetodoPago();
        if (metodo == null) metodo = MetodoPago.EFECTIVO;
        String referencia = null;
        String banco = null;
        if (metodo.requiereReferencia()) {
            referencia = textoONulo(req.referencia());
            if (referencia == null) {
                throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Indica el número de referencia del pago (" + metodo.getNombre() + ")");
            }
            // Se aceptan espacios o guiones al escribir, pero se guardan solo los digitos/letras
            referencia = referencia.replaceAll("[\\s-]", "");
            if (!referencia.matches(metodo.getFormatoReferencia())) {
                throw new ErrorNegocio(HttpStatus.BAD_REQUEST, metodo.getErrorReferencia());
            }
            if (metodo == MetodoPago.ZELLE) referencia = referencia.toUpperCase();
        }
        if (metodo.requiereBanco()) {
            banco = textoONulo(req.banco());
            if (banco == null) throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Selecciona el banco de origen del pago");
            if (!Bancos.existe(banco)) throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El banco seleccionado no es válido");
        }
        orden.setMetodoPago(metodo);
        orden.setPagoReferencia(referencia);
        orden.setPagoBanco(banco);

        StringBuilder detalle = new StringBuilder(metodo.getNombre());
        if (banco != null) detalle.append(" · ").append(Bancos.nombre(banco));
        if (referencia != null) detalle.append(metodo == MetodoPago.TARJETA ? " · Aprobación " : " · Ref. ").append(referencia);
        return detalle.toString();
    }

    private String registrarEnvio(Orden orden, CambiarEstadoRequest req) {
        if (orden.getMetodoEntrega() == MetodoEntrega.DELIVERY) {
            orden.setEmpresaEnvio(null);
            orden.setNumeroGuia(null);
            return "Delivery en camino";
        }
        EmpresaEnvio empresa = req.empresaEnvio() != null ? req.empresaEnvio() : orden.getEmpresaEnvio();
        if (empresa == null) throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Selecciona la empresa de envío");
        String guia = textoONulo(req.numeroGuia());
        if (guia == null) throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "Indica el número de guía de " + empresa.getNombre());
        guia = guia.replaceAll("\\s", "").toUpperCase();
        if (!guia.matches("[A-Z0-9-]{4,30}")) {
            throw new ErrorNegocio(HttpStatus.BAD_REQUEST, "El número de guía solo puede tener letras, números y guiones (4 a 30)");
        }
        orden.setEmpresaEnvio(empresa);
        orden.setNumeroGuia(guia);
        return empresa.getNombre() + " · Guía " + guia;
    }

    private String registrarEntrega(Orden orden, CambiarEstadoRequest req) {
        String recibe = textoONulo(req.recibidoPor());
        orden.setRecibidoPor(recibe);
        String accion = orden.getMetodoEntrega() == MetodoEntrega.RETIRO_TIENDA ? "Retirado en tienda" : "Entregado";
        return recibe == null ? accion : accion + " · Recibió " + recibe;
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
