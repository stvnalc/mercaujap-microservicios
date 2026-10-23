package com.ujap.ordenes.model;

/**
 * Formas de pago aceptadas por la tienda.
 * Cada una sabe que dato pide al confirmar el pago: solo el NUMERO de referencia
 * (el metodo y el banco van en sus propios campos, no dentro del texto).
 */
public enum MetodoPago {
    EFECTIVO("Efectivo", null, null, false),
    TARJETA("Tarjeta de débito o crédito", "\\d{4,12}", "El número de aprobación debe tener solo números (4 a 12 dígitos)", false),
    TRANSFERENCIA("Transferencia bancaria", "\\d{4,20}", "La referencia de la transferencia debe tener solo números (4 a 20 dígitos)", true),
    PAGO_MOVIL("Pago móvil", "\\d{4,12}", "La referencia del pago móvil debe tener solo números (4 a 12 dígitos)", true),
    ZELLE("Zelle", "[A-Za-z0-9]{6,20}", "El código de confirmación de Zelle debe tener de 6 a 20 letras o números", false);

    private final String nombre;
    private final String formatoReferencia;   // expresion regular; null = no pide referencia
    private final String errorReferencia;
    private final boolean requiereBanco;

    MetodoPago(String nombre, String formatoReferencia, String errorReferencia, boolean requiereBanco) {
        this.nombre = nombre;
        this.formatoReferencia = formatoReferencia;
        this.errorReferencia = errorReferencia;
        this.requiereBanco = requiereBanco;
    }

    public String getNombre() { return nombre; }
    public String getFormatoReferencia() { return formatoReferencia; }
    public String getErrorReferencia() { return errorReferencia; }
    public boolean requiereReferencia() { return formatoReferencia != null; }
    public boolean requiereBanco() { return requiereBanco; }
    public boolean soloNumeros() { return formatoReferencia != null && formatoReferencia.startsWith("\\d"); }
}
