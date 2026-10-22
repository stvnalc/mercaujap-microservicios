/*
 * Microservicio de PRODUCTOS (catalogo e inventario)
 * Lenguaje: Node.js | Framework: Express | ODM: Mongoose | BD: MongoDB (NoSQL)
 *
 * Endpoints:
 *   GET    /health                       -> estado del servicio
 *   GET    /productos                    -> lista (?q= ?categoria= ?estado=disponible|bajo|agotado ?activo= ?orden=)
 *   GET    /productos/categorias         -> categorias con cantidad de productos y valor del inventario
 *   GET    /productos/:id                -> un producto (lo usa servicio-java)
 *   POST   /productos                    -> crea un producto (el stock inicial queda como movimiento)
 *   PUT    /productos/:id                -> actualiza datos (el stock NO, eso va por movimientos)
 *   DELETE /productos/:id                -> elimina un producto y su historial
 *   PATCH  /productos/:id/stock          -> entrada/salida de stock { cantidad, motivo, referencia } (lo usa servicio-java)
 *   GET    /productos/:id/movimientos    -> historial de stock (kardex) de un producto
 *   GET    /movimientos                  -> ultimos movimientos de todo el inventario
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Producto = require('./producto.model');
const Movimiento = require('./movimiento.model');
const PRODUCTOS_INICIALES = require('./datos-iniciales');

const PORT = process.env.PORT || 3000;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017/productos_db';
const CAMPOS_EDITABLES = ['sku', 'nombre', 'marca', 'descripcion', 'categoria', 'precio', 'costo', 'stockMinimo', 'activo'];

const app = express();
app.use(cors({ exposedHeaders: ['X-Total-Count'] }));
app.use(express.json({ limit: '100kb' }));

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

// Respuesta 400 si el id no tiene formato de ObjectId de MongoDB
function validarId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: 'Id de producto inválido' });
  }
  next();
}

// Evita que un texto de busqueda se interprete como expresion regular
const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// El API Gateway envia el nombre del usuario que hizo la peticion (%-codificado)
function usuarioDe(req) {
  try {
    return decodeURIComponent(req.get('X-Usuario-Nombre') || '') || 'Sistema';
  } catch {
    return 'Sistema';
  }
}

function elegir(objeto, campos) {
  return Object.fromEntries(campos.filter((c) => objeto[c] !== undefined).map((c) => [c, objeto[c]]));
}

function prefijoSku(categoria = '') {
  const limpio = categoria.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  return (limpio + 'GEN').slice(0, 3);
}

async function generarSku(categoria) {
  for (let i = 0; i < 10; i++) {
    const sku = `${prefijoSku(categoria)}-${Math.floor(10000 + Math.random() * 90000)}`;
    if (!(await Producto.exists({ sku }))) return sku;
  }
  throw new Error('No se pudo generar un SKU único');
}

const envolver = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------
app.get('/health', (req, res) => {
  const conectado = mongoose.connection.readyState === 1;
  res.status(conectado ? 200 : 503).json({
    status: conectado ? 'ok' : 'sin conexion a MongoDB',
    servicio: 'productos',
    lenguaje: 'Node.js',
    bd: 'MongoDB',
  });
});

const ORDENES = {
  nombre: { nombre: 1 },
  precio: { precio: 1 },
  '-precio': { precio: -1 },
  stock: { stock: 1 },
  reciente: { createdAt: -1 },
};

app.get('/productos', envolver(async (req, res) => {
  const filtro = {};
  const { q, categoria, estado, activo, orden } = req.query;
  if (categoria) filtro.categoria = categoria;
  if (activo === 'true' || activo === 'false') filtro.activo = activo === 'true';
  if (q) {
    const patron = new RegExp(escaparRegex(String(q).trim()), 'i');
    filtro.$or = [{ nombre: patron }, { sku: patron }, { marca: patron }];
  }
  if (estado === 'agotado') filtro.stock = { $lte: 0 };
  if (estado === 'bajo') filtro.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$stockMinimo'] }] };
  if (estado === 'disponible') filtro.$expr = { $gt: ['$stock', '$stockMinimo'] };

  const productos = await Producto.find(filtro).sort(ORDENES[orden] || { nombre: 1 });
  res.set('X-Total-Count', String(productos.length)).json(productos);
}));

app.get('/productos/categorias', envolver(async (req, res) => {
  const categorias = await Producto.aggregate([
    {
      $group: {
        _id: '$categoria',
        productos: { $sum: 1 },
        unidades: { $sum: '$stock' },
        valor: { $sum: { $multiply: ['$precio', '$stock'] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, categoria: '$_id', productos: 1, unidades: 1, valor: { $round: ['$valor', 2] } } },
  ]);
  res.json(categorias);
}));

app.get('/productos/:id', validarId, envolver(async (req, res) => {
  const producto = await Producto.findById(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
}));

app.post('/productos', envolver(async (req, res) => {
  const datos = elegir(req.body, CAMPOS_EDITABLES);
  const stockInicial = req.body.stock === undefined || req.body.stock === '' ? 0 : Number(req.body.stock);
  if (!Number.isInteger(stockInicial) || stockInicial < 0) {
    return res.status(400).json({ error: 'El stock inicial debe ser un entero mayor o igual a 0' });
  }
  if (!datos.sku) datos.sku = await generarSku(datos.categoria);

  const producto = await Producto.create({ ...datos, stock: stockInicial });
  if (stockInicial > 0) {
    await Movimiento.create({
      producto: producto._id, productoNombre: producto.nombre, sku: producto.sku, tipo: 'entrada',
      cantidad: stockInicial, stockAnterior: 0, stockNuevo: stockInicial, motivo: 'Inventario inicial', usuario: usuarioDe(req),
    });
  }
  res.status(201).json(producto);
}));

app.put('/productos/:id', validarId, envolver(async (req, res) => {
  const producto = await Producto.findByIdAndUpdate(req.params.id, elegir(req.body, CAMPOS_EDITABLES), {
    new: true,
    runValidators: true,
  });
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
}));

app.delete('/productos/:id', validarId, envolver(async (req, res) => {
  const producto = await Producto.findByIdAndDelete(req.params.id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  await Movimiento.deleteMany({ producto: producto._id });
  res.status(204).send();
}));

// Suma o resta stock de forma ATOMICA: si se pide restar mas de lo que hay,
// MongoDB no encuentra el documento (por el filtro stock >= X) y respondemos 409.
// Cada cambio queda registrado en la coleccion "movimientos".
app.patch('/productos/:id/stock', validarId, envolver(async (req, res) => {
  const cantidad = Number(req.body.cantidad);
  if (!Number.isInteger(cantidad) || cantidad === 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un entero distinto de 0' });
  }
  const tipo = req.body.tipo === 'ajuste' ? 'ajuste' : cantidad > 0 ? 'entrada' : 'salida';
  const motivo = String(req.body.motivo || (cantidad > 0 ? 'Entrada de mercancía' : 'Salida de mercancía')).slice(0, 120);
  const referencia = req.body.referencia ? String(req.body.referencia).slice(0, 40) : undefined;
  // Solo las llamadas internas entre servicios (sin pasar por el gateway) pueden indicar la fecha
  // del movimiento; la usa servicio-java al cargar el historial de demostracion.
  const fechaInterna = !req.get('X-Usuario-Id') && req.body.fecha ? new Date(req.body.fecha) : null;
  const fecha = fechaInterna && !Number.isNaN(fechaInterna.getTime()) ? fechaInterna : new Date();

  const filtro = { _id: req.params.id };
  if (cantidad < 0) filtro.stock = { $gte: -cantidad };

  const producto = await Producto.findOneAndUpdate(filtro, { $inc: { stock: cantidad } }, { new: true });
  if (!producto) {
    const actual = await Producto.findById(req.params.id);
    return actual
      ? res.status(409).json({ error: `Stock insuficiente de ${actual.nombre} (disponible: ${actual.stock})` })
      : res.status(404).json({ error: 'Producto no encontrado' });
  }
  await Movimiento.create({
    producto: producto._id, productoNombre: producto.nombre, sku: producto.sku, tipo, cantidad,
    stockAnterior: producto.stock - cantidad, stockNuevo: producto.stock, motivo, referencia, usuario: usuarioDe(req), fecha,
  });
  res.json(producto);
}));

app.get('/productos/:id/movimientos', validarId, envolver(async (req, res) => {
  const limite = Math.min(Number(req.query.limit) || 100, 500);
  const movimientos = await Movimiento.find({ producto: req.params.id }).sort({ fecha: -1 }).limit(limite);
  res.json(movimientos);
}));

app.get('/movimientos', envolver(async (req, res) => {
  const limite = Math.min(Number(req.query.limit) || 100, 500);
  const filtro = {};
  if (['entrada', 'salida', 'ajuste'].includes(req.query.tipo)) filtro.tipo = req.query.tipo;
  if (req.query.q) {
    const patron = new RegExp(escaparRegex(String(req.query.q).trim()), 'i');
    filtro.$or = [{ productoNombre: patron }, { sku: patron }, { referencia: patron }, { motivo: patron }];
  }
  res.json(await Movimiento.find(filtro).sort({ fecha: -1 }).limit(limite));
}));

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejo centralizado de errores
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join('; ') });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Valor inválido para ${err.path}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Ya existe un producto con ese SKU' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
  }
  console.error('[node]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
async function cargarDatosIniciales() {
  // Productos de una version anterior sin SKU: se les asigna uno
  for (const p of await Producto.find({ sku: { $exists: false } }).lean()) {
    await Producto.updateOne({ _id: p._id }, { $set: { sku: await generarSku(p.categoria) } });
  }
  await Producto.syncIndexes();

  if ((await Producto.countDocuments()) === 0) {
    const creados = await Producto.insertMany(PRODUCTOS_INICIALES);
    const haceTresMeses = new Date(Date.now() - 90 * 24 * 3600 * 1000);
    await Movimiento.insertMany(
      creados
        .filter((p) => p.stock > 0)
        .map((p) => ({
          producto: p._id, productoNombre: p.nombre, sku: p.sku, tipo: 'entrada', cantidad: p.stock,
          stockAnterior: 0, stockNuevo: p.stock, motivo: 'Inventario inicial', fecha: haceTresMeses,
        }))
    );
    console.log(`[node] ${creados.length} productos de ejemplo creados`);
  }
}

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

  await cargarDatosIniciales();
  app.listen(PORT, () => console.log(`[node] Servicio de productos escuchando en el puerto ${PORT}`));
}

iniciar();
