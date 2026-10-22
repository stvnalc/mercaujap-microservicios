/*
 * Frontend de MercaUJAP (JavaScript puro, sin frameworks).
 * Todas las peticiones van al API Gateway con rutas relativas "/api/...".
 * El gateway (Nginx) decide a que microservicio mandar cada una.
 */
const API = '/api';

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------

// fetch + JSON + manejo de errores en un solo lugar
async function api(ruta, opciones = {}) {
  const resp = await fetch(API + ruta, {
    headers: { 'Content-Type': 'application/json' },
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  if (resp.status === 204) return null;
  const datos = await resp.json().catch(() => null);
  if (!resp.ok) {
    // FastAPI devuelve {detail}, los demas {error}
    let mensaje = datos?.error || datos?.detail || `Error ${resp.status}`;
    if (Array.isArray(mensaje)) mensaje = mensaje.map((d) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(', ');
    throw new Error(mensaje);
  }
  return datos;
}

const $ = (sel) => document.querySelector(sel);
const dinero = (n) => '$' + Number(n || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Evita inyectar HTML cuando mostramos texto escrito por el usuario
function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(mensaje, tipo = '') {
  const div = document.createElement('div');
  div.className = `toast ${tipo}`;
  div.textContent = mensaje;
  $('#toasts').appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// Ventana de confirmacion propia. Devuelve una promesa true/false.
function confirmar(texto) {
  return new Promise((resolver) => {
    $('#modal-texto').textContent = texto;
    $('#modal').classList.remove('oculto');
    const cerrar = (valor) => {
      $('#modal').classList.add('oculto');
      $('#modal-si').onclick = $('#modal-no').onclick = null;
      resolver(valor);
    };
    $('#modal-si').onclick = () => cerrar(true);
    $('#modal-no').onclick = () => cerrar(false);
  });
}

function datosFormulario(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// ---------------------------------------------------------------------
// Navegacion entre secciones
// ---------------------------------------------------------------------
const cargadores = {
  inicio: cargarInicio,
  productos: cargarProductos,
  usuarios: cargarUsuarios,
  ordenes: cargarOrdenes,
  reportes: cargarReportes,
};

function mostrarSeccion(nombre) {
  document.querySelectorAll('.menu-item').forEach((b) => b.classList.toggle('activo', b.dataset.seccion === nombre));
  document.querySelectorAll('.seccion').forEach((s) => s.classList.toggle('activa', s.id === nombre));
  history.replaceState(null, '', '#' + nombre);
  cargadores[nombre]();
}

document.querySelectorAll('.menu-item').forEach((b) => b.addEventListener('click', () => mostrarSeccion(b.dataset.seccion)));

// ---------------------------------------------------------------------
// Estado de los servicios (health checks a traves del gateway)
// ---------------------------------------------------------------------
async function revisarServicios() {
  for (const li of document.querySelectorAll('#lista-estado li')) {
    const punto = li.querySelector('.punto');
    try {
      await api('/health/' + li.dataset.svc);
      punto.className = 'punto ok';
    } catch {
      punto.className = 'punto caido';
    }
  }
}

// ---------------------------------------------------------------------
// INICIO (servicio Go)
// ---------------------------------------------------------------------
function barras(contenedor, filas, etiqueta, valor, formato) {
  if (!filas.length) {
    contenedor.innerHTML = '<p class="vacio">Todavía no hay ventas. Crea una orden en la sección Órdenes.</p>';
    return;
  }
  const max = Math.max(...filas.map(valor)) || 1;
  contenedor.innerHTML = filas
    .map(
      (f) => `<div class="barra-fila">
        <span class="nombre" title="${esc(etiqueta(f))}">${esc(etiqueta(f))}</span>
        <div class="barra-fondo"><div class="barra-relleno" style="width:${(valor(f) / max) * 100}%"></div></div>
        <span class="valor">${formato(valor(f))}</span>
      </div>`
    )
    .join('');
}

async function cargarInicio() {
  try {
    const r = await api('/reportes/resumen');
    $('#kpi-ventas').textContent = dinero(r.totalVentas);
    $('#kpi-ordenes').textContent = r.totalOrdenes;
    $('#kpi-ticket').textContent = dinero(r.ticketPromedio);
    $('#kpi-unidades').textContent = r.unidadesVendidas;
    $('#kpi-usuarios').textContent = r.totalUsuarios;
    $('#kpi-inventario').textContent = dinero(r.valorInventario);

    const aviso = $('#aviso-caidos');
    aviso.classList.toggle('oculto', r.serviciosNoDisponibles.length === 0);
    aviso.textContent = '⚠️ No respondieron: ' + r.serviciosNoDisponibles.join(', ') + '. Los datos pueden estar incompletos.';

    barras($('#top-productos'), r.topProductos, (p) => `${p.icono || ''} ${p.nombre}`, (p) => p.cantidad, (v) => v + ' u.');
    barras($('#ventas-categoria'), r.ventasPorCategoria, (c) => c.categoria, (c) => c.ingresos, dinero);

    $('#top-clientes').innerHTML = r.topClientes.length
      ? '<ul class="lista-simple">' +
        r.topClientes.map((c) => `<li><span>${esc(c.nombre)} <small>(${c.ordenes} órdenes)</small></span><b>${dinero(c.gastado)}</b></li>`).join('') +
        '</ul>'
      : '<p class="vacio">Sin clientes con compras todavía.</p>';

    $('#stock-bajo').innerHTML = r.stockBajo.length
      ? '<ul class="lista-simple">' +
        r.stockBajo.map((p) => `<li><span>${esc(p.icono)} ${esc(p.nombre)}</span><b style="color:var(--peligro)">${p.stock} en stock</b></li>`).join('') +
        '</ul>'
      : '<p class="vacio">Todo el inventario está bien 👍</p>';
  } catch (e) {
    toast('No se pudo cargar el resumen: ' + e.message, 'error');
  }
}

// ---------------------------------------------------------------------
// PRODUCTOS (servicio Node + MongoDB)
// ---------------------------------------------------------------------
let productos = [];

async function cargarProductos() {
  try {
    const q = $('#buscar-producto').value.trim();
    productos = await api('/productos' + (q ? '?q=' + encodeURIComponent(q) : ''));
    pintarProductos();
  } catch (e) {
    toast('Error cargando productos: ' + e.message, 'error');
  }
}

function pintarProductos() {
  const grid = $('#grid-productos');
  if (!productos.length) {
    grid.innerHTML = '<p class="vacio">No hay productos.</p>';
    return;
  }
  grid.innerHTML = productos
    .map(
      (p) => `<div class="producto">
        <span class="icono">${esc(p.icono || '📦')}</span>
        <span class="categoria">${esc(p.categoria)}</span>
        <h4>${esc(p.nombre)}</h4>
        <span class="desc">${esc(p.descripcion)}</span>
        <span class="precio">${dinero(p.precio)}</span>
        <span class="stock ${p.stock <= 5 ? 'bajo' : ''}">Stock: ${p.stock}</span>
        <div class="acciones">
          <button class="btn chico" onclick="editarProducto('${p._id}')">✏️ Editar</button>
          <button class="btn chico" onclick="eliminarProducto('${p._id}')">🗑️ Eliminar</button>
        </div>
      </div>`
    )
    .join('');
}

function limpiarFormProducto() {
  $('#form-producto').reset();
  $('#form-producto [name=id]').value = '';
  $('#titulo-form-producto').textContent = '➕ Nuevo producto';
}

function editarProducto(id) {
  const p = productos.find((x) => x._id === id);
  const form = $('#form-producto');
  for (const campo of ['id', 'nombre', 'categoria', 'precio', 'stock', 'icono', 'descripcion']) {
    form.elements[campo].value = campo === 'id' ? p._id : p[campo] ?? '';
  }
  $('#titulo-form-producto').textContent = '✏️ Editando: ' + p.nombre;
  form.scrollIntoView({ behavior: 'smooth' });
}

async function eliminarProducto(id) {
  const p = productos.find((x) => x._id === id);
  if (!(await confirmar(`¿Eliminar "${p.nombre}" del catálogo?`))) return;
  try {
    await api('/productos/' + id, { method: 'DELETE' });
    toast('Producto eliminado', 'ok');
    cargarProductos();
  } catch (e) {
    toast(e.message, 'error');
  }
}

$('#form-producto').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const { id, ...datos } = datosFormulario(ev.target);
  datos.precio = Number(datos.precio);
  datos.stock = Number(datos.stock);
  if (!datos.icono) delete datos.icono;
  if (!datos.categoria) delete datos.categoria;
  try {
    if (id) await api('/productos/' + id, { method: 'PUT', body: datos });
    else await api('/productos', { method: 'POST', body: datos });
    toast(id ? 'Producto actualizado' : 'Producto creado', 'ok');
    limpiarFormProducto();
    cargarProductos();
  } catch (e) {
    toast(e.message, 'error');
  }
});
$('#cancelar-producto').addEventListener('click', limpiarFormProducto);

let temporizadorBusqueda;
$('#buscar-producto').addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(cargarProductos, 300);
});

// ---------------------------------------------------------------------
// USUARIOS (servicio Python + PostgreSQL)
// ---------------------------------------------------------------------
let usuarios = [];

async function cargarUsuarios() {
  try {
    usuarios = await api('/usuarios');
    $('#tabla-usuarios').innerHTML =
      usuarios
        .map(
          (u) => `<tr>
          <td>${u.id}</td><td>${esc(u.nombre)}</td><td>${esc(u.email)}</td>
          <td>${esc(u.telefono)}</td><td>${esc(u.direccion)}</td>
          <td class="der">
            <button class="btn chico" onclick="editarUsuario(${u.id})">✏️</button>
            <button class="btn chico" onclick="eliminarUsuario(${u.id})">🗑️</button>
          </td></tr>`
        )
        .join('') || '<tr><td colspan="6" class="vacio">No hay usuarios.</td></tr>';
  } catch (e) {
    toast('Error cargando usuarios: ' + e.message, 'error');
  }
}

function limpiarFormUsuario() {
  $('#form-usuario').reset();
  $('#form-usuario [name=id]').value = '';
  $('#titulo-form-usuario').textContent = '➕ Nuevo usuario';
}

function editarUsuario(id) {
  const u = usuarios.find((x) => x.id === id);
  const form = $('#form-usuario');
  for (const campo of ['id', 'nombre', 'email', 'telefono', 'direccion']) form.elements[campo].value = u[campo] ?? '';
  $('#titulo-form-usuario').textContent = '✏️ Editando: ' + u.nombre;
  form.scrollIntoView({ behavior: 'smooth' });
}

async function eliminarUsuario(id) {
  const u = usuarios.find((x) => x.id === id);
  if (!(await confirmar(`¿Eliminar al usuario "${u.nombre}"?`))) return;
  try {
    await api('/usuarios/' + id, { method: 'DELETE' });
    toast('Usuario eliminado', 'ok');
    cargarUsuarios();
  } catch (e) {
    toast(e.message, 'error');
  }
}

$('#form-usuario').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const { id, ...datos } = datosFormulario(ev.target);
  for (const k of ['telefono', 'direccion']) if (!datos[k]) datos[k] = null;
  try {
    if (id) await api('/usuarios/' + id, { method: 'PUT', body: datos });
    else await api('/usuarios', { method: 'POST', body: datos });
    toast(id ? 'Usuario actualizado' : 'Usuario creado', 'ok');
    limpiarFormUsuario();
    cargarUsuarios();
  } catch (e) {
    toast(e.message, 'error');
  }
});
$('#cancelar-usuario').addEventListener('click', limpiarFormUsuario);

// ---------------------------------------------------------------------
// ORDENES (servicio Java + PostgreSQL, se comunica con Python y Node)
// ---------------------------------------------------------------------
const ESTADOS = ['PENDIENTE', 'PAGADA', 'ENVIADA', 'ENTREGADA', 'CANCELADA'];
let carrito = []; // [{ producto, cantidad }]

async function cargarOrdenes() {
  try {
    // Cargamos usuarios, productos y ordenes en paralelo
    const [us, ps, ordenes] = await Promise.all([api('/usuarios'), api('/productos'), api('/ordenes')]);
    usuarios = us;
    productos = ps;

    const usuarioSel = $('#orden-usuario').value;
    $('#orden-usuario').innerHTML = usuarios.map((u) => `<option value="${u.id}">${esc(u.nombre)} — ${esc(u.email)}</option>`).join('');
    if (usuarioSel) $('#orden-usuario').value = usuarioSel;
    $('#orden-producto').innerHTML = productos
      .map((p) => `<option value="${p._id}" ${p.stock === 0 ? 'disabled' : ''}>${esc(p.icono)} ${esc(p.nombre)} — ${dinero(p.precio)} (stock ${p.stock})</option>`)
      .join('');

    $('#tabla-ordenes').innerHTML =
      ordenes
        .map(
          (o) => `<tr>
          <td>${o.id}</td>
          <td>${fecha(o.fecha)}</td>
          <td>${esc(o.usuarioNombre)}</td>
          <td>${o.items.map((i) => `${i.cantidad} × ${esc(i.productoNombre)}`).join('<br>')}</td>
          <td><b>${dinero(o.total)}</b></td>
          <td>${
            o.estado === 'CANCELADA'
              ? '<span class="estado CANCELADA">CANCELADA</span>'
              : `<select onchange="cambiarEstado(${o.id}, this.value)">${ESTADOS.map((e) => `<option ${e === o.estado ? 'selected' : ''}>${e}</option>`).join('')}</select>`
          }</td>
          <td class="der"><button class="btn chico" onclick="eliminarOrden(${o.id})">🗑️</button></td>
        </tr>`
        )
        .join('') || '<tr><td colspan="7" class="vacio">Todavía no hay órdenes.</td></tr>';
    pintarCarrito();
  } catch (e) {
    toast('Error cargando órdenes: ' + e.message, 'error');
  }
}

function pintarCarrito() {
  const ul = $('#carrito-items');
  if (!carrito.length) {
    ul.innerHTML = '<li class="vacio">Vacío</li>';
  } else {
    ul.innerHTML = carrito
      .map(
        (c, i) => `<li><span>${c.cantidad} × ${esc(c.producto.icono)} ${esc(c.producto.nombre)}</span>
          <span>${dinero(c.producto.precio * c.cantidad)} <button class="btn chico" onclick="quitarDelCarrito(${i})">✕</button></span></li>`
      )
      .join('');
  }
  $('#carrito-total').textContent = dinero(carrito.reduce((t, c) => t + c.producto.precio * c.cantidad, 0));
}

function quitarDelCarrito(i) {
  carrito.splice(i, 1);
  pintarCarrito();
}

$('#agregar-item').addEventListener('click', () => {
  const producto = productos.find((p) => p._id === $('#orden-producto').value);
  const cantidad = parseInt($('#orden-cantidad').value, 10);
  if (!producto || !(cantidad > 0)) return toast('Elige un producto y una cantidad válida', 'error');
  const existente = carrito.find((c) => c.producto._id === producto._id);
  if (existente) existente.cantidad += cantidad;
  else carrito.push({ producto, cantidad });
  pintarCarrito();
});

$('#crear-orden').addEventListener('click', async (ev) => {
  if (!carrito.length) return toast('El carrito está vacío', 'error');
  const boton = ev.target;
  boton.disabled = true;
  try {
    const orden = await api('/ordenes', {
      method: 'POST',
      body: {
        usuarioId: Number($('#orden-usuario').value),
        items: carrito.map((c) => ({ productoId: c.producto._id, cantidad: c.cantidad })),
      },
    });
    toast(`Orden #${orden.id} creada por ${dinero(orden.total)}`, 'ok');
    carrito = [];
    cargarOrdenes();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    boton.disabled = false;
  }
});

async function cambiarEstado(id, estado) {
  if (estado === 'CANCELADA' && !(await confirmar(`¿Cancelar la orden #${id}? El stock se devolverá al inventario.`))) {
    return cargarOrdenes();
  }
  try {
    await api(`/ordenes/${id}/estado`, { method: 'PATCH', body: { estado } });
    toast(`Orden #${id} → ${estado}`, 'ok');
  } catch (e) {
    toast(e.message, 'error');
  }
  cargarOrdenes();
}

async function eliminarOrden(id) {
  if (!(await confirmar(`¿Eliminar la orden #${id}? Si no estaba cancelada, el stock se devuelve.`))) return;
  try {
    await api('/ordenes/' + id, { method: 'DELETE' });
    toast('Orden eliminada', 'ok');
    cargarOrdenes();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ---------------------------------------------------------------------
// REPORTES (servicio Go + PostgreSQL)
// ---------------------------------------------------------------------
async function cargarReportes() {
  try {
    const reportes = await api('/reportes');
    $('#tabla-reportes').innerHTML =
      reportes
        .map(
          (r) => `<tr>
          <td>${r.id}</td><td>${fecha(r.creadoEn)}</td><td><b>${dinero(r.totalVentas)}</b></td>
          <td>${r.totalOrdenes}</td><td>${r.totalUsuarios}</td><td>${r.totalProductos}</td><td>${esc(r.productoTop) || '—'}</td>
          <td class="der">
            <button class="btn chico" onclick="verReporte(${r.id})">👁️ Ver</button>
            <button class="btn chico" onclick="eliminarReporte(${r.id})">🗑️</button>
          </td></tr>`
        )
        .join('') || '<tr><td colspan="8" class="vacio">No hay reportes guardados. Pulsa "Generar y guardar reporte".</td></tr>';
  } catch (e) {
    toast('Error cargando reportes: ' + e.message, 'error');
  }
}

async function verReporte(id) {
  try {
    const r = await api('/reportes/' + id);
    $('#detalle-id').textContent = '#' + r.id;
    $('#detalle-json').textContent = JSON.stringify(r.detalle, null, 2);
    $('#detalle-reporte').classList.remove('oculto');
    $('#detalle-reporte').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function eliminarReporte(id) {
  if (!(await confirmar(`¿Eliminar el reporte #${id}?`))) return;
  try {
    await api('/reportes/' + id, { method: 'DELETE' });
    $('#detalle-reporte').classList.add('oculto');
    toast('Reporte eliminado', 'ok');
    cargarReportes();
  } catch (e) {
    toast(e.message, 'error');
  }
}

$('#generar-reporte').addEventListener('click', async () => {
  try {
    const r = await api('/reportes', { method: 'POST' });
    toast(`Reporte #${r.id} guardado`, 'ok');
    cargarReportes();
  } catch (e) {
    toast(e.message, 'error');
  }
});

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------
revisarServicios();
setInterval(revisarServicios, 10000);
const inicial = location.hash.slice(1);
mostrarSeccion(cargadores[inicial] ? inicial : 'inicio');
