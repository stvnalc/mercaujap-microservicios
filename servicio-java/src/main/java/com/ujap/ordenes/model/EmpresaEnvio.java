package com.ujap.ordenes.model;

/** Empresas de encomiendas con las que trabaja la tienda (envio nacional). */
public enum EmpresaEnvio {
    MRW("MRW"),
    ZOOM("Zoom"),
    TEALCA("Tealca"),
    DOMESA("Domesa"),
    LIBERTY_EXPRESS("Liberty Express");

    private final String nombre;

    EmpresaEnvio(String nombre) { this.nombre = nombre; }

    public String getNombre() { return nombre; }
}
