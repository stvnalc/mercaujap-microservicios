package com.ujap.ordenes.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.Instant;

/** Tabla "orden_historial": cada cambio de estado de un pedido (quien, cuando y por que). */
@Entity
@Table(name = "orden_historial")
public class HistorialEstado {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoOrden estado;

    private Instant fecha;

    @Column(length = 300)
    private String nota;

    private String usuario;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orden_id")
    private Orden orden;

    public HistorialEstado() {}

    public HistorialEstado(EstadoOrden estado, Instant fecha, String nota, String usuario) {
        this.estado = estado;
        this.fecha = fecha;
        this.nota = nota;
        this.usuario = usuario;
    }

    public Long getId() { return id; }
    public EstadoOrden getEstado() { return estado; }
    public Instant getFecha() { return fecha; }
    public String getNota() { return nota; }
    public String getUsuario() { return usuario; }
    public Orden getOrden() { return orden; }
    public void setOrden(Orden orden) { this.orden = orden; }
}
