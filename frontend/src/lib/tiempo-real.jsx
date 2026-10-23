import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api, sesion } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/*
 * TIEMPO REAL: una sola conexion WebSocket por pestaña (ws://<host>/api/tiempo-real).
 * Cuando otra persona crea o cambia algo, el servidor envia un evento y:
 *   - las pantallas que muestran esos datos se recargan solas (ver useApi),
 *   - aparece un aviso con quien hizo el cambio,
 *   - la fila que cambio se resalta un momento en las tablas.
 * Si la conexion se cae, se reintenta sola (1 s, 2 s, 4 s... hasta 30 s).
 */
const Contexto = createContext(null);
const MAX_ACTIVIDAD = 30;
const RESALTE_MS = 4000;

const urlSocket = () => `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/tiempo-real`;

export function ProveedorTiempoReal({ children }) {
  const { usuario, actualizarUsuario } = useAuth();
  const [estado, setEstado] = useState('conectando'); // conectando | conectado | desconectado
  const [presencia, setPresencia] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [recientes, setRecientes] = useState(() => new Set()); // "tema:id" cambiados por otros
  const oyentes = useRef(new Set());
  const yo = useRef(usuario?.id);
  yo.current = usuario?.id;

  const emitir = useCallback((evento) => {
    for (const fn of oyentes.current) fn(evento);
  }, []);

  useEffect(() => {
    let ws = null;
    let reintento = null;
    let latido = null;
    let espera = 1000;
    let cerrado = false;
    let huboConexion = false;

    const marcar = (clave) => {
      setRecientes((s) => new Set(s).add(clave));
      setTimeout(() => setRecientes((s) => {
        const n = new Set(s);
        n.delete(clave);
        return n;
      }), RESALTE_MS);
    };

    const alMensaje = (e) => {
      let m;
      try {
        m = JSON.parse(e.data);
      } catch {
        return;
      }
      if (m.tipo === 'presencia') return setPresencia(m.usuarios ?? []);
      if (m.tipo !== 'evento') return;

      const propio = m.usuario?.id === yo.current;
      emitir(m);
      if (!propio && m.id != null) marcar(`${m.tema}:${m.id}`);
      if (m.mensaje && m.usuario) {
        setActividad((a) => [{ ...m, clave: `${m.fecha}-${Math.random()}`, propio }, ...a].slice(0, MAX_ACTIVIDAD));
        if (!propio) toast(m.usuario.nombre, { description: m.mensaje, duration: 5000 });
      }
      // Si otro administrador cambio MI cuenta (nombre, rol o la desactivo), refrescar la sesion
      if (m.tema === 'usuarios' && m.id === yo.current && !propio) {
        api('/auth/me').then(actualizarUsuario).catch(() => {});
      }
    };

    const conectar = () => {
      if (cerrado || !sesion.token) return;
      setEstado('conectando');
      // El navegador no deja enviar "Authorization" en un WebSocket: el token va como subprotocolo
      ws = new WebSocket(urlSocket(), ['mercaujap', sesion.token]);
      ws.onopen = () => {
        setEstado('conectado');
        espera = 1000;
        // Si se perdio la conexion un rato, pudo haber cambios: recargar todo una vez
        if (huboConexion) emitir({ tipo: 'evento', tema: '*', accion: 'reconexion' });
        huboConexion = true;
        clearInterval(latido);
        latido = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('ping'), 25000);
      };
      ws.onmessage = alMensaje;
      ws.onclose = () => {
        clearInterval(latido);
        setPresencia([]);
        if (cerrado) return;
        setEstado('desconectado');
        reintento = setTimeout(conectar, espera);
        espera = Math.min(espera * 2, 30000);
      };
    };

    // Al volver a la pestaña o recuperar internet se reconecta de inmediato
    const reconectarYa = () => {
      if (ws?.readyState === WebSocket.CLOSED) {
        clearTimeout(reintento);
        espera = 1000;
        conectar();
      }
    };
    window.addEventListener('online', reconectarYa);
    document.addEventListener('visibilitychange', reconectarYa);

    conectar();
    return () => {
      cerrado = true;
      clearTimeout(reintento);
      clearInterval(latido);
      window.removeEventListener('online', reconectarYa);
      document.removeEventListener('visibilitychange', reconectarYa);
      ws?.close();
    };
  }, [usuario?.id, emitir, actualizarUsuario]);

  const suscribir = useCallback((fn) => {
    oyentes.current.add(fn);
    return () => oyentes.current.delete(fn);
  }, []);

  const valor = useMemo(() => ({ estado, presencia, actividad, recientes, suscribir }), [estado, presencia, actividad, recientes, suscribir]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

const SIN_PROVEEDOR = { estado: 'desconectado', presencia: [], actividad: [], recientes: new Set(), suscribir: () => () => {} };
export const useTiempoReal = () => useContext(Contexto) ?? SIN_PROVEEDOR;

/**
 * Ejecuta "accion" cuando llega un evento de alguno de los temas (debounce para agrupar rafagas:
 * un pedido nuevo genera el evento del pedido y uno de stock por cada producto).
 */
export function useEventos(temas, accion, { espera = 350 } = {}) {
  const { suscribir } = useTiempoReal();
  const ref = useRef(accion);
  ref.current = accion;
  const clave = temas?.join(',') ?? '';

  useEffect(() => {
    if (!clave) return;
    const lista = clave.split(',');
    let t = null;
    const quitar = suscribir((ev) => {
      if (ev.tema !== '*' && !lista.includes(ev.tema)) return;
      clearTimeout(t);
      t = setTimeout(() => ref.current(ev), espera);
    });
    return () => {
      clearTimeout(t);
      quitar();
    };
  }, [clave, suscribir, espera]);
}

/** Temas de los que depende una ruta de la API (para recargarla cuando cambian). */
export function temasDeRuta(ruta) {
  if (!ruta) return null;
  if (/^\/(productos|movimientos)/.test(ruta)) return ['productos'];
  if (/^\/ordenes\/catalogos/.test(ruta)) return null;
  if (/^\/ordenes/.test(ruta)) return ['ordenes'];
  if (/^\/(usuarios|auth)/.test(ruta)) return ['usuarios'];
  if (/^\/reportes\/resumen/.test(ruta)) return ['ordenes', 'productos', 'usuarios'];
  if (/^\/reportes\/?(\?|$)/.test(ruta)) return ['reportes'];
  return null; // un reporte guardado es una foto: no cambia
}
