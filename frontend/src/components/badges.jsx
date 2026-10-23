import { Store, Truck, Bike } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ESTADOS, ROLES } from '@/lib/format';
import { cn } from '@/lib/utils';

const ICONOS_ENTREGA = { RETIRO_TIENDA: Store, DELIVERY: Bike, ENVIO_NACIONAL: Truck };

export function IconoEntrega({ metodo, className }) {
  const Icono = ICONOS_ENTREGA[metodo] ?? Truck;
  return <Icono className={className} />;
}

export function EstadoBadge({ estado, className }) {
  const e = ESTADOS[estado] ?? { etiqueta: estado, clase: '' };
  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', e.clase, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {e.etiqueta}
    </Badge>
  );
}

const STOCK = {
  agotado: { texto: 'Agotado', clase: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
  bajo: { texto: 'Stock bajo', clase: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  disponible: { texto: 'Disponible', clase: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
};

export function StockBadge({ estado }) {
  const s = STOCK[estado] ?? STOCK.disponible;
  return (
    <Badge variant="outline" className={cn('font-medium', s.clase)}>
      {s.texto}
    </Badge>
  );
}

export function RolBadge({ rol }) {
  const clase =
    rol === 'admin'
      ? 'border-primary/30 bg-primary/10 text-primary'
      : rol === 'vendedor'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300'
        : '';
  return (
    <Badge variant="outline" className={clase}>
      {ROLES[rol] ?? rol}
    </Badge>
  );
}

export function ActivoBadge({ activo }) {
  return activo ? (
    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
      Activo
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      Inactivo
    </Badge>
  );
}
