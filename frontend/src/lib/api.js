// Cliente HTTP de la aplicacion. TODAS las peticiones van al API Gateway (/api/...),
// que valida la sesion y las reparte al microservicio correspondiente.
const BASE = '/api';
const CLAVE_TOKEN = 'mercaujap.token';

export class ApiError extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

export const sesion = {
  get token() {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  guardar(token) {
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* modo privado: la sesion dura hasta recargar */
    }
  },
  borrar() {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada */
    }
  },
};

// Convierte las distintas formas de error de cada servicio en un solo mensaje
function mensajeDeError(datos, status) {
  let m = datos?.error ?? datos?.detail ?? datos?.message;
  if (Array.isArray(m)) m = m.map((d) => d.msg).join('; ');
  if (typeof m === 'string' && m) return m;
  if (status === 0) return 'No hay conexión con el servidor';
  return `Error ${status}`;
}

export async function api(ruta, { method = 'GET', body, crudo = false, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (sesion.token) headers.Authorization = `Bearer ${sesion.token}`;

  let resp;
  try {
    resp = await fetch(BASE + ruta, { method, headers, signal, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('No hay conexión con el servidor. Verifica que el sistema esté encendido', 0);
  }

  if (resp.status === 401 && !ruta.startsWith('/auth/login')) {
    window.dispatchEvent(new CustomEvent('sesion-expirada'));
  }
  if (!resp.ok) {
    const datos = await resp.json().catch(() => null);
    throw new ApiError(mensajeDeError(datos, resp.status), resp.status);
  }
  if (crudo) return resp;
  if (resp.status === 204) return null;
  return resp.json().catch(() => null);
}

// Descarga un archivo protegido (ej: CSV de un reporte) usando el token
export async function descargar(ruta, nombrePorDefecto) {
  const resp = await api(ruta, { crudo: true });
  const blob = await resp.blob();
  const disp = resp.headers.get('Content-Disposition') || '';
  const nombre = /filename="?([^"]+)"?/.exec(disp)?.[1] || nombrePorDefecto;
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
