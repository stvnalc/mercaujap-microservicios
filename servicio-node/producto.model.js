// Esquema del documento "Producto" en MongoDB (Mongoose).
// En MongoDB no hay tablas: hay colecciones de documentos JSON.
const mongoose = require('mongoose');

const entero = {
  validator: Number.isInteger,
  message: (p) => `${p.path} debe ser un número entero`,
};

const productoSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{3,20}$/, 'El SKU solo admite letras, números y guiones (3 a 20 caracteres)'],
    },
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [120, 'El nombre admite máximo 120 caracteres'],
    },
    marca: { type: String, trim: true, default: '', maxlength: 60 },
    descripcion: { type: String, trim: true, default: '', maxlength: 500 },
    categoria: { type: String, trim: true, default: 'General', maxlength: 60 },
    precio: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0.01, 'El precio debe ser mayor que 0'],
    },
    costo: { type: Number, default: 0, min: [0, 'El costo no puede ser negativo'] },
    stock: { type: Number, default: 0, min: [0, 'El stock no puede ser negativo'], validate: entero },
    stockMinimo: { type: Number, default: 5, min: [0, 'El stock mínimo no puede ser negativo'], validate: entero },
    activo: { type: Boolean, default: true },
  },
  {
    timestamps: true, // agrega createdAt y updatedAt automaticamente
    versionKey: false,
    toJSON: { virtuals: true },
  }
);

// Campos calculados (no se guardan en la BD, se agregan al JSON de respuesta)
productoSchema.virtual('estadoStock').get(function () {
  if (this.stock <= 0) return 'agotado';
  if (this.stock <= this.stockMinimo) return 'bajo';
  return 'disponible';
});

productoSchema.virtual('margen').get(function () {
  if (!this.precio) return 0;
  return Math.round(((this.precio - (this.costo || 0)) / this.precio) * 1000) / 1000;
});

productoSchema.index({ nombre: 1 });
productoSchema.index({ categoria: 1 });

module.exports = mongoose.model('Producto', productoSchema);
