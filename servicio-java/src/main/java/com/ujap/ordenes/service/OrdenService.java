package com.ujap.ordenes.service;

import com.ujap.ordenes.client.ServiciosClient;
import com.ujap.ordenes.client.ServiciosClient.ProductoDto;
import com.ujap.ordenes.client.ServiciosClient.UsuarioDto;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.exception.ErrorNegocio;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.Orden;
import com.ujap.ordenes.model.OrdenItem;
import com.ujap.ordenes.repository.OrdenRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Logica de negocio de las ordenes. */
@Service
public class OrdenService {

    private final OrdenRepository repo;
    private final ServiciosClient servicios;

    public OrdenService(OrdenRepository repo, ServiciosClient servicios) {
        this.repo = repo;
        this.servicios = servicios;
    }

    public List<Orden> listar(Long usuarioId) {
        return usuarioId == null ? repo.findAllByOrderByFechaDesc() : repo.findByUsuarioIdOrderByFechaDesc(usuarioId);
    }

    public Orden obtener(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ErrorNegocio(HttpStatus.NOT_FOUND, "La orden " + id + " no existe"));
    }

    /**
     * Crear una orden:
     *  1. Pregunta a Python si el usuario existe.
     *  2. Pregunta a Node el precio y stock de cada producto.
     *  3. Le pide a Node que descuente el stock.
     *     Si algo falla a mitad de camino, devuelve el stock ya descontado
     *     (compensacion, porque cada servicio tiene su propia base de datos).
     *  4. Guarda la orden en PostgreSQL.
     */
    public Orden crear(CrearOrdenRequest req) {
        UsuarioDto usuario = servicios.obtenerUsuario(req.usuarioId());

        // Si el mismo producto viene repetido, sumamos las cantidades
        Map<String, Integer> cantidades = new LinkedHashMap<>();
        for (CrearOrdenRequest.Item item : req.items()) {
            cantidades.merge(item.productoId(), item.cantidad(), Integer::sum);
        }

        Orden orden = new Orden();
        orden.setUsuarioId(usuario.id());
        orden.setUsuarioNombre(usuario.nombre());

        BigDecimal total = BigDecimal.ZERO;
        for (Map.Entry<String, Integer> e : cantidades.entrySet()) {
            ProductoDto producto = servicios.obtenerProducto(e.getKey());
            int cantidad = e.getValue();
            if (producto.stock() == null || producto.stock() < cantidad) {
                throw new ErrorNegocio(HttpStatus.CONFLICT,
                        "Stock insuficiente de " + producto.nombre() + " (disponible: " + producto.stock() + ")");
            }
            OrdenItem item = new OrdenItem();
            item.setProductoId(e.getKey());
            item.setProductoNombre(producto.nombre());
            item.setPrecioUnitario(producto.precio());
            item.setCantidad(cantidad);
            item.setSubtotal(producto.precio().multiply(BigDecimal.valueOf(cantidad)));
            orden.agregarItem(item);
            total = total.add(item.getSubtotal());
        }
        orden.setTotal(total);

        List<OrdenItem> descontados = new ArrayList<>();
        try {
            for (OrdenItem item : orden.getItems()) {
                servicios.ajustarStock(item.getProductoId(), -item.getCantidad());
                descontados.add(item);
            }
            return repo.save(orden);
        } catch (RuntimeException ex) {
            devolverStock(descontados);
            throw ex;
        }
    }

    public Orden cambiarEstado(Long id, EstadoOrden nuevo) {
        Orden orden = obtener(id);
        if (orden.getEstado() == EstadoOrden.CANCELADA) {
            throw new ErrorNegocio(HttpStatus.CONFLICT, "La orden ya esta cancelada");
        }
        if (nuevo == EstadoOrden.CANCELADA) {
            devolverStock(orden.getItems());
        }
        orden.setEstado(nuevo);
        return repo.save(orden);
    }

    public void eliminar(Long id) {
        Orden orden = obtener(id);
        if (orden.getEstado() != EstadoOrden.CANCELADA) {
            devolverStock(orden.getItems());
        }
        repo.delete(orden);
    }

    private void devolverStock(List<OrdenItem> items) {
        for (OrdenItem item : items) {
            try {
                servicios.ajustarStock(item.getProductoId(), item.getCantidad());
            } catch (ErrorNegocio e) {
                // El producto pudo haber sido eliminado del catalogo; seguimos con los demas
                System.err.println("[java] No se pudo devolver stock de " + item.getProductoId() + ": " + e.getMessage());
            }
        }
    }
}
