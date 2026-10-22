package com.ujap.ordenes.dto;

import com.ujap.ordenes.model.EstadoOrden;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** JSON que recibe PATCH /ordenes/{id}/estado. Ejemplo: { "estado": "PAGADA", "nota": "Pago verificado" } */
public record CambiarEstadoRequest(
        @NotNull(message = "estado es obligatorio") EstadoOrden estado,
        @Size(max = 300, message = "máximo 300 caracteres") String nota
) {}
