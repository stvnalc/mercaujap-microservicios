package com.ujap.ordenes.dto;

import com.ujap.ordenes.model.EmpresaEnvio;
import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.MetodoPago;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * JSON que recibe PATCH /ordenes/{id}/estado. Cada estado pide sus propios datos:
 *   PAGADA    { "estado": "PAGADA", "metodoPago": "PAGO_MOVIL", "banco": "0134", "referencia": "004512" }
 *   ENVIADA   { "estado": "ENVIADA", "empresaEnvio": "MRW", "numeroGuia": "7745120" }
 *   ENTREGADA { "estado": "ENTREGADA", "recibidoPor": "María González" }
 *   CANCELADA { "estado": "CANCELADA", "nota": "El cliente desistió de la compra" }
 * "nota" es un comentario opcional en cualquier estado (obligatorio al cancelar).
 */
public record CambiarEstadoRequest(
        @NotNull(message = "estado es obligatorio") EstadoOrden estado,
        @Size(max = 300, message = "la nota admite máximo 300 caracteres") String nota,
        MetodoPago metodoPago,
        @Size(max = 4, message = "banco inválido") String banco,
        @Size(max = 30, message = "la referencia admite máximo 30 caracteres") String referencia,
        EmpresaEnvio empresaEnvio,
        @Size(max = 30, message = "el número de guía admite máximo 30 caracteres") String numeroGuia,
        @Size(max = 100, message = "el nombre de quien recibe admite máximo 100 caracteres") String recibidoPor
) {
    public CambiarEstadoRequest(EstadoOrden estado, String nota) {
        this(estado, nota, null, null, null, null, null, null);
    }
}
