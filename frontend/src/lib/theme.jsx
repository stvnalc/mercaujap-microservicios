import { createContext, useContext, useEffect, useState } from 'react';

// Tema claro / oscuro / sistema. Se recuerda en el navegador.
const ContextoTema = createContext({ tema: 'system', setTema: () => {}, oscuro: false });
const CLAVE = 'mercaujap.tema';

function leer() {
  try {
    return localStorage.getItem(CLAVE) || 'system';
  } catch {
    return 'system';
  }
}

export function ProveedorTema({ children }) {
  const [tema, setTemaEstado] = useState(leer);
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const aplicar = () => {
      const esOscuro = tema === 'dark' || (tema === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', esOscuro);
      setOscuro(esOscuro);
    };
    aplicar();
    media.addEventListener('change', aplicar);
    return () => media.removeEventListener('change', aplicar);
  }, [tema]);

  const setTema = (t) => {
    setTemaEstado(t);
    try {
      localStorage.setItem(CLAVE, t);
    } catch {
      /* nada */
    }
  };

  return <ContextoTema.Provider value={{ tema, setTema, oscuro }}>{children}</ContextoTema.Provider>;
}

export const useTema = () => useContext(ContextoTema);
