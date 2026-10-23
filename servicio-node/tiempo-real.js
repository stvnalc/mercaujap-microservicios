/*
 * TIEMPO REAL (WebSocket)
 * El panel abre UNA conexion WebSocket a /api/tiempo-real (el gateway la reenvia aqui a /tiempo-real).
 * Cada vez que algo cambia en cualquier microservicio se envia un evento a todos los conectados:
 *
 *   { "tipo": "evento", "tema": "ordenes", "accion": "estado", "id": 12,
 *     "mensaje": "PED-000012 pasó a Enviado", "usuario": { "id": 1, "nombre": "Andrea Salazar" } }
 *
 * - Los cambios de productos/stock los publica este mismo servicio.
 * - Python (clientes, equipo) y Java (pedidos) avisan con POST /interno/eventos.
 *   Esa ruta NO esta publicada en el gateway: solo se puede llamar desde la red interna de Docker.
 * Ademas se envia la lista de personas conectadas ("presencia") cada vez que alguien entra o sale.
 */
const { WebSocketServer, WebSocket } = require('ws');

const PROTOCOLO = 'mercaujap';
const TEMAS = ['productos', 'ordenes', 'usuarios', 'reportes'];
let wss = null;

function decodificar(valor) {
  try {
    return decodeURIComponent(valor || '');
  } catch {
    return valor || '';
  }
}

function enviarATodos(mensaje) {
  if (!wss) return;
  const datos = JSON.stringify(mensaje);
  for (const ws of wss.clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(datos);
  }
}

// Personas conectadas (una misma persona puede tener varias pestañas abiertas)
function presencia() {
  const usuarios = new Map();
  for (const ws of wss.clients) {
    if (ws.usuario && ws.readyState === WebSocket.OPEN) {
      const u = usuarios.get(ws.usuario.id) ?? { ...ws.usuario, conexiones: 0 };
      u.conexiones++;
      usuarios.set(ws.usuario.id, u);
    }
  }
  return [...usuarios.values()];
}

const avisarPresencia = () => enviarATodos({ tipo: 'presencia', usuarios: presencia() });

/** Publica un evento a todos los navegadores conectados. */
function publicar({ tema, accion, id = null, mensaje = null, usuario = null }) {
  if (!TEMAS.includes(tema)) return false;
  enviarATodos({ tipo: 'evento', tema, accion, id, mensaje, usuario, fecha: new Date().toISOString() });
  return true;
}

/** Usuario que hizo la peticion HTTP (cabeceras que agrega el API Gateway). */
function autorDe(req) {
  const id = Number(req.get('X-Usuario-Id'));
  return id ? { id, nombre: decodificar(req.get('X-Usuario-Nombre')) } : null;
}

function iniciarTiempoReal(server) {
  wss = new WebSocketServer({
    server,
    path: '/tiempo-real',
    maxPayload: 4 * 1024,
    // El navegador ofrece ["mercaujap", <token>]; el token solo lo usa el gateway para validar la sesion
    handleProtocols: (protocolos) => (protocolos.has(PROTOCOLO) ? PROTOCOLO : false),
  });

  wss.on('connection', (ws, req) => {
    // Solo se aceptan conexiones que pasaron por el gateway (ya autenticadas)
    const id = Number(req.headers['x-usuario-id']);
    if (!id) return ws.close(4401, 'Sesión requerida');

    ws.usuario = { id, nombre: decodificar(req.headers['x-usuario-nombre']), rol: req.headers['x-usuario-rol'] || null };
    ws.vivo = true;
    ws.on('pong', () => (ws.vivo = true));
    ws.on('message', (datos) => {
      // El navegador solo envia "ping" para mantener viva la conexion
      if (String(datos) === 'ping') ws.send(JSON.stringify({ tipo: 'pong' }));
    });
    ws.on('close', avisarPresencia);
    ws.on('error', () => ws.terminate());

    ws.send(JSON.stringify({ tipo: 'bienvenida', usuario: ws.usuario }));
    avisarPresencia();
  });

  // Cada 30 s se cierran las conexiones que ya no responden (wifi caido, laptop suspendida...)
  const latido = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.vivo) {
        ws.terminate();
        continue;
      }
      ws.vivo = false;
      ws.ping();
    }
  }, 30000);
  wss.on('close', () => clearInterval(latido));

  console.log('[node] Canal de tiempo real (WebSocket) activo en /tiempo-real');
}

const conectados = () => (wss ? wss.clients.size : 0);

module.exports = { iniciarTiempoReal, publicar, autorDe, conectados, TEMAS };
