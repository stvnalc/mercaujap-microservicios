package com.ujap.ordenes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Microservicio de ORDENES (pedidos)
 * Lenguaje: Java | Framework: Spring Boot | ORM: Spring Data JPA | BD: PostgreSQL
 *
 * Endpoints:
 *   GET    /health                -> estado del servicio
 *   GET    /ordenes               -> lista (filtro opcional ?usuarioId=)
 *   GET    /ordenes/{id}          -> una orden con sus items
 *   POST   /ordenes               -> crea una orden (habla con Python y Node)
 *   PATCH  /ordenes/{id}/estado   -> cambia el estado (CANCELADA devuelve el stock)
 *   DELETE /ordenes/{id}          -> elimina la orden (devuelve el stock si no estaba cancelada)
 */
@SpringBootApplication
public class OrdenesApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrdenesApplication.class, args);
    }
}
