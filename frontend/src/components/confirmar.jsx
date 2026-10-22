import { createContext, useCallback, useContext, useRef, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';

// const confirmar = useConfirmar();  if (await confirmar({ titulo, descripcion })) { ... }
const Contexto = createContext(async () => false);

export function ProveedorConfirmar({ children }) {
  const [opciones, setOpciones] = useState(null);
  const resolver = useRef(null);

  const confirmar = useCallback(
    (op) =>
      new Promise((res) => {
        resolver.current = res;
        setOpciones(op);
      }),
    []
  );

  const cerrar = (valor) => {
    resolver.current?.(valor);
    resolver.current = null;
    setOpciones(null);
  };

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <AlertDialog open={!!opciones} onOpenChange={(abierto) => !abierto && cerrar(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{opciones?.titulo}</AlertDialogTitle>
            {opciones?.descripcion && <AlertDialogDescription>{opciones.descripcion}</AlertDialogDescription>}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => cerrar(false)}>{opciones?.cancelar ?? 'Cancelar'}</AlertDialogCancel>
            <AlertDialogAction
              className={opciones?.destructivo ? buttonVariants({ variant: 'destructive' }) : undefined}
              onClick={() => cerrar(true)}
            >
              {opciones?.accion ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Contexto.Provider>
  );
}

export const useConfirmar = () => useContext(Contexto);
