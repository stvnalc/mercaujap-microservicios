package com.ujap.ordenes.model;

import java.util.EnumSet;
import java.util.Set;

/**
 * Ciclo de vida de un pedido (maquina de estados):
 *
 *   PENDIENTE --> PAGADA --> ENVIADA --> ENTREGADA
 *       |            |
 *       +------------+-----> CANCELADA
 *
 * ENTREGADA y CANCELADA son estados finales.
 */
public enum EstadoOrden {
    PENDIENTE,
    PAGADA,
    ENVIADA,
    ENTREGADA,
    CANCELADA;

    public Set<EstadoOrden> siguientes() {
        return switch (this) {
            case PENDIENTE -> EnumSet.of(PAGADA, CANCELADA);
            case PAGADA -> EnumSet.of(ENVIADA, CANCELADA);
            case ENVIADA -> EnumSet.of(ENTREGADA);
            case ENTREGADA, CANCELADA -> EnumSet.noneOf(EstadoOrden.class);
        };
    }

    public boolean puedePasarA(EstadoOrden nuevo) {
        return siguientes().contains(nuevo);
    }
}
