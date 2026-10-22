package com.ujap.ordenes;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Microservicio de ORDENES (pedidos)
 * Lenguaje: Java | Framework: Spring Boot | ORM: Spring Data JPA | BD: PostgreSQL
 *
 * Endpoints:
 *   GET    /health                -> estado del servicio
 *   GET    /ordenes               -> lista (filtros ?estado= ?usuarioId= ?desde=AAAA-MM-DD ?hasta= ?q=)
 *   GET    /ordenes/{id}          -> un pedido con sus items e historial de estados
 *   POST   /ordenes               -> crea un pedido (habla con Python y Node)
 *   PATCH  /ordenes/{id}/estado   -> avanza el estado (CANCELADA devuelve el stock)
 *   DELETE /ordenes/{id}          -> elimina un pedido CANCELADO
 */
@SpringBootApplication
public class OrdenesApplication {
    public static void main(String[] args) {
        SpringApplication.run(OrdenesApplication.class, args);
    }
}
