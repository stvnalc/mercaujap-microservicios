import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

// Carga datos de la API y expone { datos, cargando, error, recargar }.
// Si "ruta" es null no hace nada (util para cargas condicionales).
export function useApi(ruta, { inicial = null } = {}) {
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
