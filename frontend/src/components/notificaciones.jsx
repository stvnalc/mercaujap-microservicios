import { Link } from 'react-router-dom';
import { Bell, FileBarChart, Package, PackageX, ReceiptText, TriangleAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hace } from '@/lib/format';
import { useTiempoReal } from '@/lib/tiempo-real';

const ICONO_TEMA = { ordenes: ReceiptText, productos: Package, usuarios: Users, reportes: FileBarChart };

// A donde lleva cada evento de actividad al hacer clic
function enlace(ev) {
  if (ev.accion === 'eliminado') return null;
  if (ev.tema === 'ordenes') return `/pedidos/${ev.id}`;
  if (ev.tema === 'productos') return `/productos?id=${ev.id}`;
  if (ev.tema === 'usuarios') return ev.mensaje?.includes('cliente') ? `/clientes?id=${ev.id}` : '/equipo';
  if (ev.tema === 'reportes') return `/reportes/${ev.id}`;
  return null;
}

function Fila({ icono: Icono, color, titulo, detalle, url }) {
  const contenido = (
    <>
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icono className="size-4" />
      </span>
      <span className="grid min-w-0 text-sm leading-tight">
        <span className="font-medium">{titulo}</span>
        <span className="text-xs text-muted-foreground">{detalle}</span>
      </span>
    </>
  );
  return url ? (
    <Link to={url} className="flex gap-3 rounded-md px-3 py-2.5 hover:bg-muted">
      {contenido}
    </Link>
  ) : (
    <div className="flex gap-3 px-3 py-2.5">{contenido}</div>
  );
}

export function Notificaciones({ alertas }) {
  const { actividad } = useTiempoReal();
  const { pendientes = [], porEnviar = [], bajos = [], agotados = [] } = alertas;
  const items = [
    ...agotados.map((p) => ({ id: 'a' + p._id, icono: PackageX, color: 'text-red-600 bg-red-500/10', titulo: `${p.nombre} está agotado`, detalle: `SKU ${p.sku}`, url: `/productos?id=${p._id}` })),
    ...bajos.map((p) => ({ id: 'b' + p._id, icono: TriangleAlert, color: 'text-amber-600 bg-amber-500/10', titulo: `Quedan ${p.stock} de ${p.nombre}`, detalle: `Mínimo recomendado: ${p.stockMinimo}`, url: `/productos?id=${p._id}` })),
    ...(pendientes.length ? [{ id: 'pend', icono: ReceiptText, color: 'text-sky-600 bg-sky-500/10', titulo: `${pendientes.length} pedido(s) esperando pago`, detalle: 'Verifica los pagos recibidos', url: '/pedidos?estado=PENDIENTE' }] : []),
    ...(porEnviar.length ? [{ id: 'env', icono: ReceiptText, color: 'text-indigo-600 bg-indigo-500/10', titulo: `${porEnviar.length} pedido(s) listos para despachar`, detalle: 'Ya fueron pagados', url: '/pedidos?estado=PAGADA' }] : []),
  ];
  const nuevos = actividad.filter((a) => !a.propio).length;

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
      <PopoverContent align="end" className="w-[340px] p-0">
        <Tabs defaultValue="alertas" className="gap-0">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
            <p className="pl-1 font-medium">Notificaciones</p>
            <TabsList className="h-8">
              <TabsTrigger value="alertas" className="px-2.5 text-xs">
                Alertas {items.length > 0 && `(${items.length})`}
              </TabsTrigger>
              <TabsTrigger value="actividad" className="px-2.5 text-xs">
                Actividad {nuevos > 0 && `(${nuevos})`}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="alertas">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Todo al día. No hay alertas.</p>
            ) : (
              <ScrollArea className="max-h-80">
                <ul className="p-1">
                  {items.map((it) => (
                    <li key={it.id}>
                      <Fila {...it} />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </TabsContent>
          <TabsContent value="actividad">
            {actividad.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Aquí verás lo que hace el equipo
                <br />
                mientras tienes el panel abierto.
              </p>
            ) : (
              <ScrollArea className="max-h-80">
                <ul className="p-1">
                  {actividad.map((ev) => (
                    <li key={ev.clave}>
                      <Fila
                        icono={ICONO_TEMA[ev.tema] ?? Bell}
                        color="text-primary bg-primary/10"
                        titulo={ev.mensaje}
                        detalle={`${ev.propio ? 'Tú' : ev.usuario.nombre} · ${hace(ev.fecha)}`}
                        url={enlace(ev)}
                      />
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
