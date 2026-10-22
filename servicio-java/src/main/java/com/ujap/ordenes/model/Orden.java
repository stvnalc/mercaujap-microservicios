package com.ujap.ordenes.model;

import jakarta.persistence.*;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Tabla "ordenes". Un pedido pertenece a un cliente y tiene varios items. */
@Entity
@Table(name = "ordenes", indexes = {
        @Index(name = "idx_ordenes_usuario", columnList = "usuarioId"),
        @Index(name = "idx_ordenes_fecha", columnList = "fecha")
})
public class Orden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Codigo legible para el cliente, ej: PED-000012
    @Column(unique = true, length = 20)
    private String codigo;

    // Solo guardamos el ID del cliente: el cliente vive en la BD del servicio Python.
    // Copiamos sus datos para que el pedido no cambie si luego se edita el cliente.
    @Column(nullable = false)
    private Long usuarioId;
    private String usuarioNombre;
    private String usuarioEmail;
    private String usuarioDocumento;

    @Column(length = 200)
    private String direccionEnvio;

    @Enumerated(EnumType.STRING)
    private MetodoPago metodoPago;

    @Column(length = 500)
    private String notas;

    // BigDecimal en vez de double para no perder centavos con el dinero
    @Column(precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2)
    private BigDecimal impuesto = BigDecimal.ZERO;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoOrden estado = EstadoOrden.PENDIENTE;

    // Instant = fecha/hora en UTC; el JSON sale como "2026-10-22T14:30:00Z"
    private Instant fecha = Instant.now();
    private Instant actualizadoEn = Instant.now();
    private String creadoPor;

    // SUBSELECT: carga los items/historial de todos los pedidos de la lista en UNA consulta extra
    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @OrderBy("id ASC")
    private List<OrdenItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Fetch(FetchMode.SUBSELECT)
    @OrderBy("fecha ASC, id ASC")
    private List<HistorialEstado> historial = new ArrayList<>();

    public void agregarItem(OrdenItem item) {
        item.setOrden(this);
        items.add(item);
    }

    public void registrarEstado(EstadoOrden nuevo, Instant cuando, String nota, String usuario) {
        this.estado = nuevo;
        this.actualizadoEn = cuando;
        HistorialEstado h = new HistorialEstado(nuevo, cuando, nota, usuario);
        h.setOrden(this);
        historial.add(h);
    }

    /** Estados a los que se puede pasar desde el actual (el frontend lo usa para mostrar botones). */
    public List<EstadoOrden> getEstadosSiguientes() {
        return new ArrayList<>(estado.siguientes());
    }

    public int getUnidades() {
        return items.stream().mapToInt(OrdenItem::getCantidad).sum();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
    public String getUsuarioEmail() { return usuarioEmail; }
    public void setUsuarioEmail(String usuarioEmail) { this.usuarioEmail = usuarioEmail; }
    public String getUsuarioDocumento() { return usuarioDocumento; }
    public void setUsuarioDocumento(String usuarioDocumento) { this.usuarioDocumento = usuarioDocumento; }
    public String getDireccionEnvio() { return direccionEnvio; }
    public void setDireccionEnvio(String direccionEnvio) { this.direccionEnvio = direccionEnvio; }
    public MetodoPago getMetodoPago() { return metodoPago; }
    public void setMetodoPago(MetodoPago metodoPago) { this.metodoPago = metodoPago; }
    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getImpuesto() { return impuesto; }
    public void setImpuesto(BigDecimal impuesto) { this.impuesto = impuesto; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public EstadoOrden getEstado() { return estado; }
    public void setEstado(EstadoOrden estado) { this.estado = estado; }
    public Instant getFecha() { return fecha; }
    public void setFecha(Instant fecha) { this.fecha = fecha; }
    public Instant getActualizadoEn() { return actualizadoEn; }
    public String getCreadoPor() { return creadoPor; }
    public void setCreadoPor(String creadoPor) { this.creadoPor = creadoPor; }
    public List<OrdenItem> getItems() { return items; }
    public List<HistorialEstado> getHistorial() { return historial; }
}
