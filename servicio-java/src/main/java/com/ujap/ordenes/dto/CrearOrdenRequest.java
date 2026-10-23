package com.ujap.ordenes.dto;

import com.ujap.ordenes.model.EmpresaEnvio;
import com.ujap.ordenes.model.MetodoEntrega;
import com.ujap.ordenes.model.MetodoPago;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * JSON que recibe POST /ordenes. Ejemplo:
 * { "usuarioId": 1, "metodoPago": "PAGO_MOVIL", "metodoEntrega": "ENVIO_NACIONAL", "empresaEnvio": "MRW",
 *   "direccionEnvio": "Valencia", "notas": "Entregar en la tarde",
 *   "items": [ { "productoId": "65f...", "cantidad": 2 } ] }
 */
public record CrearOrdenRequest(
        @NotNull(message = "selecciona un cliente") Long usuarioId,
        @NotEmpty(message = "el pedido debe tener al menos un producto") @Size(max = 50, message = "máximo 50 productos por pedido")
        List<@Valid Item> items,
        MetodoPago metodoPago,
        MetodoEntrega metodoEntrega,
        EmpresaEnvio empresaEnvio,
        @Size(max = 200, message = "máximo 200 caracteres") String direccionEnvio,
        @Size(max = 500, message = "máximo 500 caracteres") String notas
) {
    public record Item(
            @NotBlank(message = "productoId es obligatorio") String productoId,
            @NotNull @Min(value = 1, message = "la cantidad mínima es 1") @Max(value = 999, message = "la cantidad máxima es 999")
            Integer cantidad
    ) {}
}
