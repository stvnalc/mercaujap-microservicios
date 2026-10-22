import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, sesion } from '@/lib/api';

// Sesion del usuario (personal de la tienda). El token JWT lo emite el servicio de usuarios.
const ContextoAuth = createContext(null);

export function ProveedorAuth({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(!!sesion.token);
  const [motivoSalida, setMotivoSalida] = useState(null);

  useEffect(() => {
    if (!sesion.token) return;
    api('/auth/me')
      .then(setUsuario)
      .catch(() => sesion.borrar())
      .finally(() => setCargando(false));
  }, []);

  const cerrarSesion = useCallback((motivo = null) => {
    sesion.borrar();
    setUsuario(null);
    setMotivoSalida(motivo);
  }, []);

  useEffect(() => {
    const alExpirar = () => cerrarSesion('Tu sesión expiró. Vuelve a iniciar sesión.');
    window.addEventListener('sesion-expirada', alExpirar);
    return () => window.removeEventListener('sesion-expirada', alExpirar);
  }, [cerrarSesion]);

  const iniciarSesion = async (email, password) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password } });
    sesion.guardar(r.token);
    setMotivoSalida(null);
    setUsuario(r.usuario);
    return r.usuario;
  };

  const valor = {
    usuario,
    cargando,
    motivoSalida,
    esAdmin: usuario?.rol === 'admin',
    iniciarSesion,
    cerrarSesion: () => cerrarSesion(null),
    actualizarUsuario: setUsuario,
  };
  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>;
}

export const useAuth = () => useContext(ContextoAuth);
