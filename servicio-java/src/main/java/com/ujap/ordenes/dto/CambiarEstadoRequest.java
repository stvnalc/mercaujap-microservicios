package com.ujap.ordenes.dto;

import com.ujap.ordenes.model.EstadoOrden;
import jakarta.validation.constraints.NotNull;

/** JSON que recibe PATCH /ordenes/{id}/estado. Ejemplo: { "estado": "PAGADA" } */
public record CambiarEstadoRequest(@NotNull(message = "estado es obligatorio") EstadoOrden estado) {}
