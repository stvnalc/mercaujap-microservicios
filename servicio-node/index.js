/*
 * Microservicio de PRODUCTOS (catalogo e inventario)
 * Lenguaje: Node.js | Framework: Express | ODM: Mongoose | BD: MongoDB (NoSQL)
 *
 * Endpoints:
 *   GET    /health                 -> estado del servicio
 *   GET    /productos              -> lista (filtros opcionales ?categoria= & ?q=)
 *   GET    /productos/:id          -> un producto (lo usa servicio-java)
 *   POST   /productos              -> crea un producto
 *   PUT    /productos/:id          -> actualiza un producto
 *   DELETE /productos/:id          -> elimina un producto
 *   PATCH  /productos/:id/stock    -> suma/resta stock { "cantidad": -2 } (lo usa servicio-java)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Producto = require('./producto.model');

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/productos_db';

const app = express();
app.use(cors());
app.use(express.json());

// Respuesta 400 si el id no tiene formato de ObjectId de MongoDB
function validarId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Id de producto invalido' });
  }
  next();
}

app.get('/health', (req, res) => {
  const conectado = mongoose.connection.readyState === 1;
  res.status(conectado ? 200 : 503).json({
    status: conectado ? 'ok' : 'sin conexion a MongoDB',
    servicio: 'productos',
    lenguaje: 'Node.js',
    bd: 'MongoDB',
  });
});

app.get('/productos', async (req, res, next) => {
  try {
    const filtro = {};
    if (req.query.categoria) filtro.categoria = req.query.categoria;
    if (req.query.q) filtro.nombre = { $regex: req.query.q, $options: 'i' };
    const productos = await Producto.find(filtro).sort({ createdAt: 1 });
    res.json(productos);
  } catch (err) {
    next(err);
  }
});

app.get('/productos/:id', validarId, async (req, res, next) => {
  try {
    const producto = await Producto.findById(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

app.post('/productos', async (req, res, next) => {
  try {
    const producto = new Producto(req.body);
    await producto.save();
    res.status(201).json(producto);
  } catch (err) {
    next(err);
  }
});

app.put('/productos/:id', validarId, async (req, res, next) => {
  try {
    const producto = await Producto.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

app.delete('/productos/:id', validarId, async (req, res, next) => {
  try {
    const producto = await Producto.findByIdAndDelete(req.params.id);
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// Suma o resta stock de forma ATOMICA: si se pide restar mas de lo que hay,
// MongoDB no encuentra el documento (por el filtro stock >= X) y respondemos 409.
app.patch('/productos/:id/stock', validarId, async (req, res, next) => {
  try {
    const cantidad = Number(req.body.cantidad);
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      return res.status(400).json({ error: 'cantidad debe ser un entero distinto de 0' });
    }
    const filtro = { _id: req.params.id };
    if (cantidad < 0) filtro.stock = { $gte: -cantidad };

    const producto = await Producto.findOneAndUpdate(filtro, { $inc: { stock: cantidad } }, { new: true });
    if (!producto) {
      const existe = await Producto.exists({ _id: req.params.id });
      return existe
        ? res.status(409).json({ error: 'Stock insuficiente' })
        : res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(producto);
  } catch (err) {
    next(err);
  }
});

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  console.error('[node]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PRODUCTOS_INICIALES = [
  { nombre: 'Laptop Lenovo IdeaPad', descripcion: 'Ryzen 5, 16GB RAM, 512GB SSD', categoria: 'Computacion', precio: 650, stock: 8, icono: '💻' },
  { nombre: 'Mouse Logitech M170', descripcion: 'Inalambrico, 2.4 GHz', categoria: 'Accesorios', precio: 15, stock: 40, icono: '🖱️' },
  { nombre: 'Teclado Mecanico Redragon', descripcion: 'Switches rojos, retroiluminado', categoria: 'Accesorios', precio: 45, stock: 20, icono: '⌨️' },
  { nombre: 'Monitor Samsung 24"', descripcion: 'Full HD, 75Hz, IPS', categoria: 'Computacion', precio: 160, stock: 12, icono: '🖥️' },
  { nombre: 'Audifonos JBL Tune 510', descripcion: 'Bluetooth, 40h de bateria', categoria: 'Audio', precio: 40, stock: 25, icono: '🎧' },
  { nombre: 'Telefono Xiaomi Redmi 13', descripcion: '8GB RAM, 256GB', categoria: 'Telefonia', precio: 210, stock: 10, icono: '📱' },
  { nombre: 'Pendrive Kingston 64GB', descripcion: 'USB 3.2', categoria: 'Almacenamiento', precio: 8, stock: 60, icono: '💾' },
  { nombre: 'Disco SSD Kingston 1TB', descripcion: 'NVMe M.2', categoria: 'Almacenamiento', precio: 70, stock: 4, icono: '🗄️' },
];

async function iniciar() {
  // Reintentos: MongoDB puede tardar unos segundos en aceptar conexiones
  for (let intento = 1; intento <= 30; intento++) {
    try {
      await mongoose.connect(MONGO_URL);
      break;
    } catch (err) {
      console.log(`[node] Esperando MongoDB (${intento}/30): ${err.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (mongoose.connection.readyState !== 1) {
    console.error('[node] No se pudo conectar a MongoDB');
    process.exit(1);
  }

  if ((await Producto.countDocuments()) === 0) {
    await Producto.insertMany(PRODUCTOS_INICIALES);
    console.log('[node] Productos de ejemplo creados');
  }

  app.listen(PORT, () => console.log(`[node] Servicio de productos escuchando en el puerto ${PORT}`));
}

iniciar();
