import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Disponibilidad de cada modulo del sistema (consulta los health checks del gateway)
const MODULOS = [
  { id: 'gateway', nombre: 'Acceso y seguridad' },
  { id: 'python', nombre: 'Clientes y cuentas' },
  { id: 'node', nombre: 'Catálogo e inventario' },
  { id: 'java', nombre: 'Pedidos' },
  { id: 'go', nombre: 'Reportes' },
];

export function EstadoSistema() {
  const [estado, setEstado] = useState({});

  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      // Cada modulo se actualiza apenas responde; si tarda mas de 5 s se considera caido
      MODULOS.forEach(async (m) => {
        const inicio = performance.now();
        let resultado;
        try {
          const r = await fetch(`/api/health/${m.id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
          resultado = { ok: r.ok, ms: Math.round(performance.now() - inicio) };
        } catch {
          resultado = { ok: false };
        }
        if (vivo) setEstado((e) => ({ ...e, [m.id]: resultado }));
      });
    };
    revisar();
    const t = setInterval(revisar, 20000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  const revisados = Object.keys(estado).length === MODULOS.length;
  const caidos = MODULOS.filter((m) => estado[m.id] && !estado[m.id].ok).length;
  const color = !revisados ? 'bg-muted-foreground' : caidos ? 'bg-red-500' : 'bg-emerald-500';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <span className="relative flex size-2">
            {revisados && !caidos && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />}
            <span className={cn('relative inline-flex size-2 rounded-full', color)} />
          </span>
          <span className="hidden md:inline">{!revisados ? 'Verificando…' : caidos ? `${caidos} servicio(s) con fallas` : 'Operativo'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <div className="flex items-center gap-2 px-1 font-medium">
          <Activity className="size-4 text-muted-foreground" /> Estado del sistema
        </div>
        <ul className="grid gap-1">
          {MODULOS.map((m) => {
            const e = estado[m.id];
            return (
              <li key={m.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                <span className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', !e ? 'bg-muted-foreground' : e.ok ? 'bg-emerald-500' : 'bg-red-500')} />
                  {m.nombre}
                </span>
                <span className="text-xs text-muted-foreground tabular">{!e ? '…' : e.ok ? `${e.ms} ms` : 'Sin respuesta'}</span>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
