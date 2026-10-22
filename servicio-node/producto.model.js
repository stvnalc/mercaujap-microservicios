// Esquema del documento "Producto" en MongoDB (Mongoose).
// En MongoDB no hay tablas: hay colecciones de documentos JSON.
const mongoose = require('mongoose');

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: '' },
    categoria: { type: String, default: 'General', trim: true },
    precio: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    icono: { type: String, default: '📦' },
  },
  { timestamps: true } // agrega createdAt y updatedAt automaticamente
);

module.exports = mongoose.model('Producto', productoSchema);
