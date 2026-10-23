package com.ujap.ordenes.demo;

import com.ujap.ordenes.client.ServiciosClient;
import com.ujap.ordenes.client.ServiciosClient.ProductoDto;
import com.ujap.ordenes.client.ServiciosClient.UsuarioDto;
import com.ujap.ordenes.dto.CambiarEstadoRequest;
import com.ujap.ordenes.dto.CrearOrdenRequest;
import com.ujap.ordenes.model.EmpresaEnvio;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.MetodoEntrega;
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
    // Repetidos = mas probables (los bancos y empresas mas usados aparecen mas)
    private static final String[] BANCOS = {"0134", "0134", "0134", "0102", "0102", "0105", "0105", "0108", "0191", "0172", "0174", "0163"};
    private static final EmpresaEnvio[] EMPRESAS = {EmpresaEnvio.MRW, EmpresaEnvio.MRW, EmpresaEnvio.MRW, EmpresaEnvio.ZOOM,
            EmpresaEnvio.ZOOM, EmpresaEnvio.TEALCA, EmpresaEnvio.DOMESA, EmpresaEnvio.LIBERTY_EXPRESS};

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
            int tipo = rnd.nextInt(100);
            MetodoEntrega entrega = tipo < 20 ? MetodoEntrega.RETIRO_TIENDA : tipo < 45 ? MetodoEntrega.DELIVERY : MetodoEntrega.ENVIO_NACIONAL;
            EmpresaEnvio empresa = entrega == MetodoEntrega.ENVIO_NACIONAL ? EMPRESAS[rnd.nextInt(EMPRESAS.length)] : null;
            String notas = switch (rnd.nextInt(8)) {
                case 0 -> entrega == MetodoEntrega.DELIVERY ? "Entregar en horario de la tarde" : null;
                case 1 -> "Cliente frecuente";
                default -> null;
            };
            try {
                Orden o = ordenes.crear(new CrearOrdenRequest(cliente.id(), items,
                        metodos[rnd.nextInt(metodos.length)], entrega, empresa, null, notas), vendedor, fecha);
                avanzar(o, diasAtras, rnd, vendedor, cuando, cliente.nombre());
                creados++;
            } catch (RuntimeException e) {
                System.out.println("[java] Datos demo: pedido omitido (" + e.getMessage() + ")");
            }
        }
        System.out.println("[java] Datos demo: " + creados + " pedidos de ejemplo creados");
    }

    /** Lleva el pedido por su ciclo de vida segun su antiguedad, con fechas coherentes. */
    private void avanzar(Orden o, int diasAtras, Random rnd, String vendedor, ZonedDateTime inicio, String cliente) {
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
        // Retiro en tienda: del pago pasa directo a entregado (no se envia)
        if (o.getMetodoEntrega() == MetodoEntrega.RETIRO_TIENDA) ruta.remove(EstadoOrden.ENVIADA);

        ZonedDateTime cuando = inicio;
        ZonedDateTime limite = ZonedDateTime.now(zona).minusMinutes(5);
        for (EstadoOrden e : ruta) {
            cuando = cuando.plus(Duration.ofHours(e == EstadoOrden.PAGADA ? 1 : 20 + rnd.nextInt(10)));
            if (cuando.isAfter(limite)) cuando = limite;
            ordenes.cambiarEstado(o.getId(), datosDelPaso(o, e, rnd, cliente), vendedor, cuando.toInstant());
        }
    }

    /** Los mismos datos que se llenan en el formulario de cada paso. */
    private static CambiarEstadoRequest datosDelPaso(Orden o, EstadoOrden e, Random rnd, String cliente) {
        return switch (e) {
            case PAGADA -> {
                MetodoPago m = o.getMetodoPago();
                String referencia = switch (m) {
                    case PAGO_MOVIL -> digitos(rnd, 8);
                    case TRANSFERENCIA -> digitos(rnd, 10);
                    case TARJETA -> digitos(rnd, 6);
                    case ZELLE -> Long.toString(Math.abs(rnd.nextLong()), 36).toUpperCase().substring(0, 10);
                    case EFECTIVO -> null;
                };
                String banco = m.requiereBanco() ? BANCOS[rnd.nextInt(BANCOS.length)] : null;
                yield new CambiarEstadoRequest(e, null, m, banco, referencia, null, null, null);
            }
            case ENVIADA -> new CambiarEstadoRequest(e, null, null, null, null, o.getEmpresaEnvio(),
                    o.getEmpresaEnvio() == null ? null : digitos(rnd, 10), null);
            case ENTREGADA -> new CambiarEstadoRequest(e, null, null, null, null, null, null,
                    rnd.nextInt(4) == 0 ? "Familiar del cliente" : cliente);
            case CANCELADA -> new CambiarEstadoRequest(e, rnd.nextBoolean() ? "El cliente desistió de la compra" : "No se recibió el pago a tiempo");
            case PENDIENTE -> new CambiarEstadoRequest(e, null);
        };
    }

    private static String digitos(Random rnd, int n) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < n; i++) sb.append(rnd.nextInt(10));
        return sb.toString();
    }

    private static void dormir(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
