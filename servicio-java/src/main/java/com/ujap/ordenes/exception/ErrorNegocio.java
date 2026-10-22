package com.ujap.ordenes.exception;

import org.springframework.http.HttpStatus;

/** Error con un codigo HTTP y un mensaje claro para el frontend. */
public class ErrorNegocio extends RuntimeException {

    private final HttpStatus status;

    public ErrorNegocio(HttpStatus status, String mensaje) {
        super(mensaje);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
