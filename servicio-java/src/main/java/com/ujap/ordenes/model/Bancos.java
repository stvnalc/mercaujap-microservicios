package com.ujap.ordenes.model;

import java.util.LinkedHashMap;
import java.util.Map;

/** Bancos de Venezuela (codigo SUDEBAN de 4 digitos -> nombre). Se guarda el codigo en el pedido. */
public final class Bancos {

    public static final Map<String, String> LISTA = new LinkedHashMap<>();

    static {
        LISTA.put("0102", "Banco de Venezuela");
        LISTA.put("0134", "Banesco");
        LISTA.put("0105", "Mercantil");
        LISTA.put("0108", "BBVA Provincial");
        LISTA.put("0191", "BNC");
        LISTA.put("0172", "Bancamiga");
        LISTA.put("0175", "Banco Digital de los Trabajadores");
        LISTA.put("0163", "Banco del Tesoro");
        LISTA.put("0115", "Banco Exterior");
        LISTA.put("0174", "Banplus");
        LISTA.put("0151", "BFC Banco Fondo Común");
        LISTA.put("0104", "Venezolano de Crédito");
        LISTA.put("0138", "Banco Plaza");
        LISTA.put("0114", "Bancaribe");
        LISTA.put("0171", "Banco Activo");
        LISTA.put("0156", "100% Banco");
        LISTA.put("0128", "Banco Caroní");
        LISTA.put("0137", "Sofitasa");
        LISTA.put("0169", "Mi Banco");
        LISTA.put("0168", "Bancrecer");
    }

    private Bancos() {}

    public static boolean existe(String codigo) { return codigo != null && LISTA.containsKey(codigo); }

    public static String nombre(String codigo) { return codigo == null ? null : LISTA.get(codigo); }
}
