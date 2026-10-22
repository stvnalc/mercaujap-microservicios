package com.ujap.ordenes.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Tabla "ordenes". Una orden pertenece a un usuario y tiene varios items. */
@Entity
@Table(name = "ordenes")
public class Orden {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Solo guardamos el ID del usuario: el usuario vive en la BD del servicio Python.
    // Copiamos el nombre para mostrarlo sin tener que preguntar cada vez.
    @Column(nullable = false)
    private Long usuarioId;

    private String usuarioNombre;

    // BigDecimal en vez de double para no perder centavos con el dinero
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoOrden estado = EstadoOrden.PENDIENTE;

    // Instant = fecha/hora en UTC; el JSON sale como "2026-10-22T14:30:00Z"
    private Instant fecha = Instant.now();

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<OrdenItem> items = new ArrayList<>();

    public void agregarItem(OrdenItem item) {
        item.setOrden(this);
        items.add(item);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String usuarioNombre) { this.usuarioNombre = usuarioNombre; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public EstadoOrden getEstado() { return estado; }
    public void setEstado(EstadoOrden estado) { this.estado = estado; }
    public Instant getFecha() { return fecha; }
    public void setFecha(Instant fecha) { this.fecha = fecha; }
    public List<OrdenItem> getItems() { return items; }
    public void setItems(List<OrdenItem> items) { this.items = items; }
}
