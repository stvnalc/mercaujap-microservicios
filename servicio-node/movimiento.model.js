// Coleccion "movimientos": historial (kardex) de cada cambio de stock.
// Cada venta, devolucion o ajuste manual queda registrado con su motivo.
const mongoose = require('mongoose');

const movimientoSchema = new mongoose.Schema(
  {
    producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto', required: true, index: true },
    productoNombre: String,
    sku: String,
    tipo: { type: String, enum: ['entrada', 'salida', 'ajuste'], required: true },
    cantidad: { type: Number, required: true }, // positiva = entra, negativa = sale
    stockAnterior: Number,
    stockNuevo: Number,
    motivo: { type: String, trim: true, maxlength: 120 },
    referencia: { type: String, trim: true, maxlength: 40 }, // ej: PED-000012
    usuario: { type: String, default: 'Sistema' },
    fecha: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

movimientoSchema.index({ fecha: -1 });

module.exports = mongoose.model('Movimiento', movimientoSchema);
