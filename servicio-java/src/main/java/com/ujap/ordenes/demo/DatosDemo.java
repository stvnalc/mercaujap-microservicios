package com.ujap.ordenes.demo;

import com.ujap.ordenes.client.ServiciosClient;
import com.ujap.ordenes.client.ServiciosClient.ProductoDto;
import com.ujap.ordenes.client.ServiciosClient.UsuarioDto;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.MetodoPago;
import com.ujap.ordenes.model.Orden;
import com.ujap.ordenes.service.OrdenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.*;

/**
 * Carga un historial de pedidos de ejemplo (ultimos 60 dias) la primera vez que arranca,
 * para que el panel tenga datos reales que mostrar. Usa la MISMA logica que un pedido normal:
 * valida cliente con Python, consulta y descuenta stock en Node y registra el historial.
 * Se desactiva con la variable de entorno DEMO_DATA=false.
 */
@Component
public class DatosDemo implements ApplicationRunner {

    private static final String[] VENDEDORES = {"Luis Herrera", "Andrea Salazar"};

    private final OrdenService ordenes;
    private final ServiciosClient servicios;
    private final boolean habilitado;
    private final ZoneId zona;

    public DatosDemo(OrdenService ordenes, ServiciosClient servicios,
                     @Value("${demo.datos:true}") boolean habilitado,
                     @Value("${tienda.zona-horaria:America/Caracas}") String zona) {
        this.ordenes = ordenes;
        this.servicios = servicios;
        this.habilitado = habilitado;
        this.zona = ZoneId.of(zona);
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!habilitado || ordenes.contar() > 0) return;
        // En segundo plano: el servicio queda disponible mientras se cargan los datos
        Thread hilo = new Thread(this::cargar, "datos-demo");
        hilo.setDaemon(true);
        hilo.start();
    }

    private void cargar() {
        List<UsuarioDto> clientes = List.of();
        List<ProductoDto> productos = List.of();
        for (int intento = 1; intento <= 60; intento++) {
            try {
                clientes = servicios.listarClientesActivos();
                productos = servicios.listarProductosActivos();
                if (!clientes.isEmpty() && !productos.isEmpty()) break;
            } catch (RuntimeException e) {
                System.out.println("[java] Datos demo: esperando a los otros servicios (" + intento + "/60)");
            }
            dormir(3000);
        }
        if (clientes.isEmpty() || productos.isEmpty() || ordenes.contar() > 0) return;

        Random rnd = new Random(2026);
        Map<String, Integer> stock = new HashMap<>();
        productos.forEach(p -> stock.put(p._id(), p.stock() == null ? 0 : p.stock()));
        MetodoPago[] metodos = {MetodoPago.PAGO_MOVIL, MetodoPago.PAGO_MOVIL, MetodoPago.TRANSFERENCIA,
                MetodoPago.TARJETA, MetodoPago.EFECTIVO, MetodoPago.ZELLE};

        ZonedDateTime hoy = ZonedDateTime.now(zona);
        ZonedDateTime ultimo = hoy.minusDays(61);
        int total = 84, creados = 0;
        for (int i = 0; i < total; i++) {
            // Mas pedidos en las ultimas semanas: el negocio va creciendo
            int diasAtras = (int) Math.round(59 * (1 - Math.pow((i + 0.5) / total, 0.85)));
            ZonedDateTime cuando = hoy.minusDays(diasAtras).withHour(9 + rnd.nextInt(10)).withMinute(rnd.nextInt(60));
            if (!cuando.isAfter(ultimo)) cuando = ultimo.plusMinutes(10 + rnd.nextInt(80)); // en orden de codigo
            if (cuando.isAfter(hoy.minusMinutes(5))) cuando = hoy.minusMinutes(5L + (total - i));
            ultimo = cuando;
            Instant fecha = cuando.toInstant();

            List<CrearOrdenRequest.Item> items = new ArrayList<>();
            List<ProductoDto> mezcla = new ArrayList<>(productos);
            Collections.shuffle(mezcla, rnd);
            int lineas = 1 + (rnd.nextInt(10) < 6 ? 0 : rnd.nextInt(3));
            for (ProductoDto p : mezcla) {
                if (items.size() >= lineas) break;
                int cantidad = rnd.nextInt(10) < 7 ? 1 : 2;
                if (stock.get(p._id()) - cantidad < 2) continue;
                stock.merge(p._id(), -cantidad, Integer::sum);
                items.add(new CrearOrdenRequest.Item(p._id(), cantidad));
            }
            if (items.isEmpty()) continue;

            UsuarioDto cliente = clientes.get(rnd.nextInt(clientes.size()));
            String vendedor = VENDEDORES[rnd.nextInt(VENDEDORES.length)];
            String notas = rnd.nextInt(5) == 0 ? "Cliente retira en tienda" : null;
            try {
                Orden o = ordenes.crear(new CrearOrdenRequest(cliente.id(), items,
                        metodos[rnd.nextInt(metodos.length)], null, notas), vendedor, fecha);
                avanzar(o, diasAtras, rnd, vendedor, cuando);
                creados++;
            } catch (RuntimeException e) {
                System.out.println("[java] Datos demo: pedido omitido (" + e.getMessage() + ")");
            }
        }
        System.out.println("[java] Datos demo: " + creados + " pedidos de ejemplo creados");
    }

    /** Lleva el pedido por su ciclo de vida segun su antiguedad, con fechas coherentes. */
    private void avanzar(Orden o, int diasAtras, Random rnd, String vendedor, ZonedDateTime inicio) {
        List<EstadoOrden> ruta = new ArrayList<>();
        int dado = rnd.nextInt(100);
        if (dado < 7) {
            ruta.add(EstadoOrden.CANCELADA);
        } else if (diasAtras >= 6) {
            ruta.addAll(List.of(EstadoOrden.PAGADA, EstadoOrden.ENVIADA, EstadoOrden.ENTREGADA));
        } else if (diasAtras >= 3) {
            ruta.addAll(dado < 60 ? List.of(EstadoOrden.PAGADA, EstadoOrden.ENVIADA, EstadoOrden.ENTREGADA)
                    : List.of(EstadoOrden.PAGADA, EstadoOrden.ENVIADA));
        } else if (diasAtras >= 1) {
            if (dado < 70) ruta.add(EstadoOrden.PAGADA);
        }

        ZonedDateTime cuando = inicio;
        ZonedDateTime limite = ZonedDateTime.now(zona).minusMinutes(5);
        for (EstadoOrden e : ruta) {
            cuando = cuando.plus(Duration.ofHours(e == EstadoOrden.PAGADA ? 1 : 20 + rnd.nextInt(10)));
            if (cuando.isAfter(limite)) cuando = limite;
            String nota = switch (e) {
                case PAGADA -> "Pago verificado";
                case ENVIADA -> "Despachado con MRW, guía " + (100000 + rnd.nextInt(899999));
                case ENTREGADA -> "Recibido por el cliente";
                case CANCELADA -> "Cliente desistió de la compra";
                default -> null;
            };
            ordenes.cambiarEstado(o.getId(), e, nota, vendedor, cuando.toInstant());
        }
    }

    private static void dormir(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
