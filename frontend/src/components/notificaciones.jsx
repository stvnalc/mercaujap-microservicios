import { Link } from 'react-router-dom';
import { Bell, PackageX, ReceiptText, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Notificaciones({ alertas }) {
  const { pendientes = [], porEnviar = [], bajos = [], agotados = [] } = alertas;
  const items = [
    ...agotados.map((p) => ({ id: 'a' + p._id, icono: PackageX, color: 'text-red-600 bg-red-500/10', titulo: `${p.nombre} está agotado`, detalle: `SKU ${p.sku}`, url: `/productos?id=${p._id}` })),
    ...bajos.map((p) => ({ id: 'b' + p._id, icono: TriangleAlert, color: 'text-amber-600 bg-amber-500/10', titulo: `Quedan ${p.stock} de ${p.nombre}`, detalle: `Mínimo recomendado: ${p.stockMinimo}`, url: `/productos?id=${p._id}` })),
    ...(pendientes.length ? [{ id: 'pend', icono: ReceiptText, color: 'text-sky-600 bg-sky-500/10', titulo: `${pendientes.length} pedido(s) esperando pago`, detalle: 'Verifica los pagos recibidos', url: '/pedidos?estado=PENDIENTE' }] : []),
    ...(porEnviar.length ? [{ id: 'env', icono: ReceiptText, color: 'text-indigo-600 bg-indigo-500/10', titulo: `${porEnviar.length} pedido(s) listos para despachar`, detalle: 'Ya fueron pagados', url: '/pedidos?estado=PAGADA' }] : []),
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <Bell />
          {items.length > 0 && (
            <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 font-semibold text-white">
              {items.length > 9 ? '9+' : items.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="font-medium">Notificaciones</p>
          <p className="text-xs text-muted-foreground">Inventario y pedidos que requieren atención</p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Todo al día. No hay alertas.</p>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="p-1">
              {items.map((it) => (
                <li key={it.id}>
                  <Link to={it.url} className="flex gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${it.color}`}>
                      <it.icono className="size-4" />
                    </span>
                    <span className="grid text-sm leading-tight">
                      <span className="font-medium">{it.titulo}</span>
                      <span className="text-xs text-muted-foreground">{it.detalle}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
