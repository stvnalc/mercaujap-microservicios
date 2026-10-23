import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/lib/auth';
import { iniciales, ROLES } from '@/lib/format';
import { useTiempoReal } from '@/lib/tiempo-real';
import { cn } from '@/lib/utils';

const ESTADOS = {
  conectado: { texto: 'En vivo', punto: 'bg-emerald-500', detalle: 'Los cambios del equipo aparecen al instante.' },
  conectando: { texto: 'Conectando', punto: 'bg-amber-500', detalle: 'Estableciendo la conexión en tiempo real…' },
  desconectado: { texto: 'Sin conexión', punto: 'bg-red-500', detalle: 'Reintentando… Mientras tanto, recarga la página para ver cambios.' },
};

// Indicador de conexion en tiempo real + quienes estan usando el panel ahora mismo
export function EnVivo() {
  const { usuario } = useAuth();
  const { estado, presencia } = useTiempoReal();
  const e = ESTADOS[estado];
  const otros = presencia.filter((p) => p.id !== usuario?.id);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2" aria-label={`${e.texto}: ${presencia.length} persona(s) conectada(s)`}>
          <span className="relative flex size-2">
            {estado === 'conectado' && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
            <span className={cn('relative inline-flex size-2 rounded-full', e.punto)} />
          </span>
          <span className="hidden text-xs font-medium lg:inline">{e.texto}</span>
          {otros.length > 0 && (
            <span className="hidden -space-x-1.5 sm:flex">
              {otros.slice(0, 3).map((p) => (
                <Avatar key={p.id} className="size-6 ring-2 ring-background">
                  <AvatarFallback className="bg-primary/15 text-[10px] font-semibold text-primary">{iniciales(p.nombre)}</AvatarFallback>
                </Avatar>
              ))}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="border-b px-4 py-3">
          <p className="flex items-center gap-2 font-medium">
            <span className={cn('size-2 rounded-full', e.punto)} /> {e.texto}
          </p>
          <p className="text-xs text-muted-foreground">{e.detalle}</p>
        </div>
        <div className="p-2">
          <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">Conectados ahora ({presencia.length})</p>
          {presencia.length === 0 ? (
            <p className="px-2 pb-2 text-sm text-muted-foreground">—</p>
          ) : (
            <ul className="grid gap-0.5">
              {presencia.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/10 text-[11px] font-medium text-primary">{iniciales(p.nombre)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 text-sm leading-tight">
                    <p className="truncate font-medium">
                      {p.nombre} {p.id === usuario?.id && <span className="font-normal text-muted-foreground">(tú)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ROLES[p.rol] ?? p.rol}
                      {p.conexiones > 1 && ` · ${p.conexiones} pestañas`}
                    </p>
                  </div>
                  <span className="size-2 rounded-full bg-emerald-500" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
