package com.ujap.ordenes.repository;

import com.ujap.ordenes.model.Orden;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA genera el SQL automaticamente:
 * findAll(), findById(), save(), deleteById() ya vienen incluidos.
 * JpaSpecificationExecutor permite armar filtros dinamicos (ver OrdenFiltros).
 */
@Repository
public interface OrdenRepository extends JpaRepository<Orden, Long>, JpaSpecificationExecutor<Orden> {
}
