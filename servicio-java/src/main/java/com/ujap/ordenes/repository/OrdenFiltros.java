package com.ujap.ordenes.repository;

import com.ujap.ordenes.model.EstadoOrden;
import com.ujap.ordenes.model.Orden;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;

/** Filtros opcionales para GET /ordenes. Cada uno agrega una condicion WHERE solo si viene el parametro. */
public final class OrdenFiltros {

    private OrdenFiltros() {}

    public static Specification<Orden> de(EstadoOrden estado, Long usuarioId, Instant desde, Instant hasta, String q) {
        return (root, query, cb) -> {
            var condiciones = cb.conjunction();
            if (estado != null) condiciones = cb.and(condiciones, cb.equal(root.get("estado"), estado));
            if (usuarioId != null) condiciones = cb.and(condiciones, cb.equal(root.get("usuarioId"), usuarioId));
            if (desde != null) condiciones = cb.and(condiciones, cb.greaterThanOrEqualTo(root.get("fecha"), desde));
            if (hasta != null) condiciones = cb.and(condiciones, cb.lessThan(root.get("fecha"), hasta));
            if (q != null && !q.isBlank()) {
                String patron = "%" + q.trim().toLowerCase() + "%";
                condiciones = cb.and(condiciones, cb.or(
                        cb.like(cb.lower(root.get("codigo")), patron),
                        cb.like(cb.lower(root.get("usuarioNombre")), patron),
                        cb.like(cb.lower(root.get("usuarioDocumento")), patron)));
            }
            return condiciones;
        };
    }
}
