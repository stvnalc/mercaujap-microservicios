package com.ujap.ordenes.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * JSON que recibe POST /ordenes. Ejemplo:
 * { "usuarioId": 1, "items": [ { "productoId": "65f...", "cantidad": 2 } ] }
 */
public record CrearOrdenRequest(
        @NotNull(message = "usuarioId es obligatorio") Long usuarioId,
        @NotEmpty(message = "la orden debe tener al menos un producto") List<@Valid Item> items
) {
    public record Item(
            @NotBlank(message = "productoId es obligatorio") String productoId,
            @NotNull @Min(value = 1, message = "la cantidad minima es 1") Integer cantidad
    ) {}
}
