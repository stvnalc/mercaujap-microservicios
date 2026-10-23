package com.ujap.ordenes.model;

/** Como recibe el cliente su pedido. Define que pasos sigue el pedido (ver EstadoOrden). */
public enum MetodoEntrega {
    RETIRO_TIENDA("Retiro en tienda"),
    DELIVERY("Delivery"),
    ENVIO_NACIONAL("Envío nacional");

    private final String nombre;

    MetodoEntrega(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }
    public boolean usaDireccion() { return this != RETIRO_TIENDA; }
}
