import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * Formulario integrado en la pagina (no flota encima ni oscurece el resto):
 * se abre en su lugar, empuja el contenido hacia abajo y deja ver los demas datos.
 * Al abrirse se desplaza hasta el y pone el cursor en el primer campo.
 */
export function PanelEnLinea({ titulo, descripcion, icono: Icono, onCerrar, children, className, enfocar = true }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Primero un campo de texto; si no hay, el primer selector
    if (enfocar) (el?.querySelector('input:not([type=hidden]):not([disabled])') ?? el?.querySelector('textarea, [role=combobox]'))?.focus({ preventScroll: true });
  }, [enfocar]);

  // Escape cierra el formulario (como un dialogo, pero sin bloquear la pagina)
  const alTeclear = (e) => {
    if (e.key === 'Escape' && onCerrar && !e.defaultPrevented) {
      e.stopPropagation();
      onCerrar();
    }
  };

  return (
    <Card ref={ref} onKeyDown={alTeclear} className={cn('scroll-mt-20 border-primary/30 ring-4 ring-primary/5 animate-in fade-in-0 slide-in-from-top-2', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {Icono && (
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icono className="size-4" />
            </span>
          )}
          {titulo}
        </CardTitle>
        {descripcion && <CardDescription>{descripcion}</CardDescription>}
        {onCerrar && (
          <CardAction>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onCerrar} aria-label="Cerrar">
              <X />
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Encabezado compacto para lo que se abre dentro de una fila de tabla. */
export function EncabezadoExpansion({ titulo, descripcion, children, onCerrar }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 py-3">
      <div className="min-w-0">
        <div className="text-base font-semibold">{titulo}</div>
        {descripcion && <div className="text-sm text-muted-foreground">{descripcion}</div>}
      </div>
      <div className="flex items-center gap-1">
        {children}
        {onCerrar && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onCerrar} aria-label="Cerrar">
            <X />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Avisa si otra persona modifico el registro mientras se editaba (tiempo real).
 * Compara solo los campos del formulario con los que tenia al empezar a editar.
 * Devuelve [cambiado, aceptar]: aceptar() toma la version nueva como punto de partida.
 * (El formulario debe montarse con key={id} para empezar de cero con cada registro.)
 */
export function useCambioExterno(actual, campos) {
  const firma = (o) => (o ? JSON.stringify(campos.map((c) => o[c] ?? null)) : '');
  const [base, setBase] = useState(() => firma(actual));
  return [!!actual && firma(actual) !== base, () => setBase(firma(actual))];
}
