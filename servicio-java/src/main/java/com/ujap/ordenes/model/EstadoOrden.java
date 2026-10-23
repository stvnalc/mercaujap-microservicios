package com.ujap.ordenes.model;

import java.util.EnumSet;
import java.util.Set;

/**
 * Ciclo de vida de un pedido (maquina de estados):
 *
 *   PENDIENTE --> PAGADA --> ENVIADA --> ENTREGADA        (delivery y envio nacional)
 *       |            |  \
 *       |            |   +-------------> ENTREGADA        (retiro en tienda: no se envia)
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

    public Set<EstadoOrden> siguientes(MetodoEntrega entrega) {
        return switch (this) {
            case PENDIENTE -> EnumSet.of(PAGADA, CANCELADA);
            case PAGADA -> entrega == MetodoEntrega.RETIRO_TIENDA ? EnumSet.of(ENTREGADA, CANCELADA) : EnumSet.of(ENVIADA, CANCELADA);
            case ENVIADA -> EnumSet.of(ENTREGADA);
            case ENTREGADA, CANCELADA -> EnumSet.noneOf(EstadoOrden.class);
        };
    }

    public boolean puedePasarA(EstadoOrden nuevo, MetodoEntrega entrega) {
        return siguientes(entrega).contains(nuevo);
    }
}
