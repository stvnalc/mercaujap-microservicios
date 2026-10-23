import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { temasDeRuta, useEventos } from '@/lib/tiempo-real';

// Carga datos de la API y expone { datos, cargando, error, recargar }.
// Si "ruta" es null no hace nada (util para cargas condicionales).
// TIEMPO REAL: si otra persona cambia datos de esa ruta (ej: /productos), se vuelve a cargar
// sola y en silencio (sin mostrar "cargando"). Se desactiva con { tiempoReal: false }.
export function useApi(ruta, { inicial = null, tiempoReal = true } = {}) {
  const [estado, setEstado] = useState({ datos: inicial, cargando: !!ruta, error: null });
  const ultima = useRef(0);

  const recargar = useCallback(
    async ({ silencioso = false } = {}) => {
      if (!ruta) return;
      const id = ++ultima.current;
      if (!silencioso) setEstado((e) => ({ ...e, cargando: true, error: null }));
      try {
        const datos = await api(ruta);
        if (id === ultima.current) setEstado({ datos, cargando: false, error: null });
      } catch (error) {
        if (id === ultima.current) setEstado((e) => ({ ...e, cargando: false, error }));
      }
    },
    [ruta]
  );

  useEffect(() => {
    recargar();
  }, [recargar]);

  useEventos(tiempoReal ? temasDeRuta(ruta) : null, () => recargar({ silencioso: true }));

  return { ...estado, recargar };
}

// Retrasa un valor (ej: texto de busqueda) para no consultar en cada tecla
export function useDebounce(valor, ms = 300) {
  const [v, setV] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setV(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return v;
}

// Opciones de los formularios de pedidos (metodos de pago, bancos, empresas de envio).
// Vienen de servicio-java y casi nunca cambian: se piden una sola vez por sesion.
let catalogos = null;
export function useCatalogos() {
  const [datos, setDatos] = useState(catalogos);
  useEffect(() => {
    if (catalogos) return;
    let vivo = true;
    api('/ordenes/catalogos')
      .then((c) => {
        catalogos = c;
        if (vivo) setDatos(c);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);
  return datos;
}
