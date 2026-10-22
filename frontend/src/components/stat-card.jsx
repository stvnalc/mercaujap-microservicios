import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Tarjeta de indicador (KPI) con variacion opcional respecto al periodo anterior
export function StatCard({ titulo, valor, icono: Icono, detalle, variacion, cargando, className }) {
  const sube = variacion != null && variacion >= 0;
  return (
    <Card className={cn('gap-0', className)}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{titulo}</span>
          {Icono && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icono className="size-4" />
            </span>
          )}
        </div>
        {cargando ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight tabular">{valor}</div>
        )}
        <div className="flex min-h-5 items-center gap-2 text-xs text-muted-foreground">
          {variacion != null && !cargando && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium',
                sube ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
              )}
            >
              {sube ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {(variacion * 100).toFixed(1).replace('.', ',')}%
            </span>
          )}
          {detalle && <span className="truncate">{detalle}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
