package com.ujap.ordenes.repository;

import com.ujap.ordenes.model.Orden;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JPA genera el SQL automaticamente:
 * findAll(), findById(), save(), deleteById() ya vienen incluidos.
 */
@Repository
public interface OrdenRepository extends JpaRepository<Orden, Long> {

    // Spring entiende el nombre del metodo y arma: WHERE usuario_id = ? ORDER BY fecha DESC
    List<Orden> findByUsuarioIdOrderByFechaDesc(Long usuarioId);

    List<Orden> findAllByOrderByFechaDesc();
}
