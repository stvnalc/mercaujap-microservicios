import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  CreditCard,
  Mail,
  MapPin,
  PackageCheck,
  Printer,
  ReceiptText,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { EstadoBadge } from '@/components/badges';
import { Vacio } from '@/components/vacio';
import { LogoMarca } from '@/components/logo';
import { useConfirmar } from '@/components/confirmar';
import { notificarCambio } from '@/components/layout';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { ACCION_ESTADO, dinero, ESTADOS, fecha, fechaHora, METODOS_PAGO } from '@/lib/format';
import { cn } from '@/lib/utils';

const PASOS = [
  { estado: 'PENDIENTE', titulo: 'Registrado', icono: ReceiptText },
  { estado: 'PAGADA', titulo: 'Pagado', icono: CircleDollarSign },
  { estado: 'ENVIADA', titulo: 'Enviado', icono: Truck },
  { estado: 'ENTREGADA', titulo: 'Entregado', icono: PackageCheck },
];

const NOTA_ESTADO = {
  PAGADA: { etiqueta: 'Referencia del pago', ejemplo: 'Ej: Pago móvil ref. 004512' },
  ENVIADA: { etiqueta: 'Empresa de envío y número de guía', ejemplo: 'Ej: MRW guía 7745120' },
  ENTREGADA: { etiqueta: 'Recibido por', ejemplo: 'Ej: Recibido por el cliente' },
  CANCELADA: { etiqueta: 'Motivo de la cancelación', ejemplo: 'Ej: El cliente desistió de la compra' },
};

const ICONO_HISTORIAL = { PENDIENTE: ReceiptText, PAGADA: CircleDollarSign, ENVIADA: Truck, ENTREGADA: CheckCircle2, CANCELADA: Ban };

function Progreso({ orden }) {
  const cancelada = orden.estado === 'CANCELADA';
  const actual = PASOS.findIndex((p) => p.estado === orden.estado);
  return (
    <ol className="grid grid-cols-4">
      {PASOS.map((p, i) => {
        const hecho = !cancelada && i <= actual;
        return (
          <li key={p.estado} className="flex flex-col items-center gap-2 text-center">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : hecho ? 'bg-primary' : 'bg-border')} />
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                  hecho ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground',
                  i === actual && !cancelada && 'ring-4 ring-primary/15'
                )}
              >
                <p.icono className="size-4" />
              </span>
              <span className={cn('h-0.5 flex-1', i === PASOS.length - 1 ? 'opacity-0' : !cancelada && i < actual ? 'bg-primary' : 'bg-border')} />
            </div>
            <span className={cn('text-xs font-medium', hecho ? 'text-foreground' : 'text-muted-foreground')}>{p.titulo}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Version para imprimir (nota de entrega). Solo se ve al imprimir.
function Comprobante({ orden }) {
  return (
    <div className="hidden text-black print:block">
      <div className="flex items-start justify-between border-b pb-4">
        <div className="flex items-center gap-3">
          <LogoMarca className="size-10 print:bg-black print:text-white" />
          <div>
            <p className="text-lg font-semibold">MercaUJAP C.A.</p>
            <p className="text-xs">RIF J-50123456-7 · Av. Universidad, Bárbula, Naguanagua, Carabobo</p>
            <p className="text-xs">ventas@mercaujap.com · 0241-555-0101</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">Nota de entrega</p>
          <p className="text-sm">{orden.codigo}</p>
          <p className="text-xs">Fecha: {fechaHora(orden.fecha)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 py-4 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase">Cliente</p>
          <p>{orden.usuarioNombre}</p>
          <p>{orden.usuarioDocumento}</p>
          <p>{orden.usuarioEmail}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase">Envío y pago</p>
          <p>{orden.direccionEnvio ?? 'Retiro en tienda'}</p>
          <p>Método: {METODOS_PAGO[orden.metodoPago]}</p>
          <p>Estado: {ESTADOS[orden.estado]?.etiqueta}</p>
        </div>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-y text-left">
            <th className="py-2">SKU</th>
            <th>Descripción</th>
            <th className="text-right">Cant.</th>
            <th className="text-right">Precio</th>
            <th className="text-right">Importe</th>
          </tr>
        </thead>
        <tbody>
          {orden.items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-1.5">{i.sku}</td>
              <td>{i.productoNombre}</td>
              <td className="text-right">{i.cantidad}</td>
              <td className="text-right">{dinero(i.precioUnitario)}</td>
              <td className="text-right">{dinero(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 text-sm">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>{dinero(orden.subtotal)}</span>
        </p>
        <p className="flex justify-between">
          <span>IVA 16 %</span>
          <span>{dinero(orden.impuesto)}</span>
        </p>
        <p className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
          <span>Total</span>
          <span>{dinero(orden.total)}</span>
        </p>
      </div>
      {orden.notas && <p className="mt-6 text-sm">Notas: {orden.notas}</p>}
      <div className="mt-16 grid grid-cols-2 gap-12 text-center text-xs">
        <p className="border-t pt-2">Entregado por</p>
        <p className="border-t pt-2">Recibido conforme</p>
      </div>
    </div>
  );
}

export function DetallePedido() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { esAdmin } = useAuth();
  const confirmar = useConfirmar();
  const { datos: orden, cargando, error, recargar } = useApi(`/ordenes/${id}`);
  const [cambio, setCambio] = useState(null); // estado al que se quiere pasar
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  if (error) {
    return (
      <Vacio icono={ReceiptText} titulo="Pedido no encontrado" descripcion="Es posible que haya sido eliminado o que el enlace sea incorrecto.">
        <Button variant="outline" asChild>
          <Link to="/pedidos">Volver a pedidos</Link>
        </Button>
      </Vacio>
    );
  }
  if (cargando || !orden) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const abrirCambio = (estado) => {
    setNota('');
    setCambio(estado);
  };

  const aplicarCambio = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api(`/ordenes/${orden.id}/estado`, { method: 'PATCH', body: { estado: cambio, nota } });
      toast.success(`${orden.codigo}: ${ESTADOS[cambio].etiqueta.toLowerCase()}`, {
        description: cambio === 'CANCELADA' ? 'El stock de los productos fue devuelto al inventario.' : undefined,
      });
      setCambio(null);
      notificarCambio();
      recargar({ silencioso: true });
    } catch (err) {
      toast.error('No se pudo actualizar el pedido', { description: err.message });
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async () => {
    const ok = await confirmar({
      titulo: `¿Eliminar el pedido ${orden.codigo}?`,
      descripcion: 'Se borrará definitivamente del historial. Esta acción no se puede deshacer.',
      accion: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    try {
      await api(`/ordenes/${orden.id}`, { method: 'DELETE' });
      toast.success(`Pedido ${orden.codigo} eliminado`);
      navegar('/pedidos');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const siguientes = orden.estadosSiguientes ?? [];
  const avanzar = siguientes.filter((s) => s !== 'CANCELADA');

  return (
    <>
      <Comprobante orden={orden} />
      <div className="flex flex-col gap-6 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" asChild aria-label="Volver">
              <Link to="/pedidos">
                <ArrowLeft />
              </Link>
            </Button>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{orden.codigo}</h1>
                <EstadoBadge estado={orden.estado} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Registrado el {fechaHora(orden.fecha)}
                {orden.creadoPor && ` por ${orden.creadoPor}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Imprimir
            </Button>
            {siguientes.includes('CANCELADA') && (
              <Button variant="destructive" onClick={() => abrirCambio('CANCELADA')}>
                <Ban /> Cancelar
              </Button>
            )}
            {esAdmin && orden.estado === 'CANCELADA' && (
              <Button variant="destructive" onClick={eliminar}>
                <Trash2 /> Eliminar
              </Button>
            )}
            {avanzar.map((s) => (
              <Button key={s} onClick={() => abrirCambio(s)}>
                {s === 'PAGADA' ? <CreditCard /> : s === 'ENVIADA' ? <Truck /> : <PackageCheck />} {ACCION_ESTADO[s]}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent>
            {orden.estado === 'CANCELADA' ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Ban className="size-4" />
                </span>
                <div>
                  <p className="font-medium">Pedido cancelado</p>
                  <p className="text-muted-foreground">Las unidades reservadas se devolvieron al inventario.</p>
                </div>
              </div>
            ) : (
              <Progreso orden={orden} />
            )}
          </CardContent>
        </Card>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <CardDescription>
                {orden.items.length} producto(s) · {orden.unidades} unidad(es)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Precio</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orden.items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>
                          <Link to={`/productos?id=${i.productoId}`} className="font-medium hover:underline">
                            {i.productoNombre}
                          </Link>
                          <p className="text-xs text-muted-foreground">{i.sku}</p>
                        </TableCell>
                        <TableCell className="text-right tabular">{i.cantidad}</TableCell>
                        <TableCell className="hidden text-right tabular sm:table-cell">{dinero(i.precioUnitario)}</TableCell>
                        <TableCell className="text-right font-medium tabular">{dinero(i.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter className="bg-transparent">
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground sm:hidden">Subtotal</TableCell>
                      <TableCell colSpan={3} className="hidden text-right text-muted-foreground sm:table-cell">Subtotal</TableCell>
                      <TableCell className="text-right tabular">{dinero(orden.subtotal)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={2} className="text-muted-foreground sm:hidden">IVA 16 %</TableCell>
                      <TableCell colSpan={3} className="hidden text-right text-muted-foreground sm:table-cell">IVA 16 %</TableCell>
                      <TableCell className="text-right tabular">{dinero(orden.impuesto)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={2} className="text-base font-semibold sm:hidden">Total</TableCell>
                      <TableCell colSpan={3} className="hidden text-right text-base font-semibold sm:table-cell">Total</TableCell>
                      <TableCell className="text-right text-base font-semibold tabular">{dinero(orden.total)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              {orden.notas && (
                <div className="mt-4 rounded-lg border border-dashed p-3 text-sm">
                  <span className="text-xs font-medium text-muted-foreground">Notas del pedido</span>
                  <p className="mt-0.5">{orden.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2.5 text-sm">
                <Link to={`/clientes?id=${orden.usuarioId}`} className="flex items-center gap-2 font-medium hover:underline">
                  <UserRound className="size-4 text-muted-foreground" /> {orden.usuarioNombre}
                </Link>
                {orden.usuarioDocumento && <p className="pl-6 text-muted-foreground">{orden.usuarioDocumento}</p>}
                <p className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" /> {orden.usuarioEmail}
                </p>
                <p className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="mt-0.5 size-4 shrink-0" /> {orden.direccionEnvio ?? 'Retiro en tienda'}
                </p>
                <p className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="size-4" /> {METODOS_PAGO[orden.metodoPago] ?? '—'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Historial</CardTitle>
                <CardDescription>Cada cambio de estado del pedido</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="relative grid gap-5 border-l pl-6">
                  {[...orden.historial].reverse().map((h) => {
                    const Icono = ICONO_HISTORIAL[h.estado] ?? Clock;
                    return (
                      <li key={h.id} className="relative">
                        <span className="absolute top-0 -left-[37px] flex size-6 items-center justify-center rounded-full border bg-background">
                          <Icono className="size-3.5 text-muted-foreground" />
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <EstadoBadge estado={h.estado} />
                          <span className="text-xs text-muted-foreground">{fechaHora(h.fecha)}</span>
                        </div>
                        {h.nota && <p className="mt-1 text-sm">{h.nota}</p>}
                        {h.usuario && <p className="text-xs text-muted-foreground">por {h.usuario}</p>}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Última actualización: {fecha(orden.actualizadoEn)}</p>
      </div>

      <Dialog open={!!cambio} onOpenChange={(a) => !a && setCambio(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={aplicarCambio} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>{cambio && (cambio === 'CANCELADA' ? `¿Cancelar ${orden.codigo}?` : ACCION_ESTADO[cambio])}</DialogTitle>
              <DialogDescription>
                {cambio === 'CANCELADA'
                  ? 'Las unidades de este pedido volverán al inventario. Esta acción no se puede deshacer.'
                  : `El pedido pasará a "${cambio && ESTADOS[cambio].etiqueta}".`}
              </DialogDescription>
            </DialogHeader>
            {cambio && (
              <Field>
                <FieldLabel htmlFor="nota-estado">
                  {NOTA_ESTADO[cambio].etiqueta} {cambio !== 'CANCELADA' && <span className="font-normal text-muted-foreground">(opcional)</span>}
                </FieldLabel>
                <Textarea id="nota-estado" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder={NOTA_ESTADO[cambio].ejemplo} maxLength={300} required={cambio === 'CANCELADA'} />
              </Field>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCambio(null)}>
                Volver
              </Button>
              <Button type="submit" variant={cambio === 'CANCELADA' ? 'destructive' : 'default'} disabled={guardando}>
                {guardando && <Spinner />} {cambio === 'CANCELADA' ? 'Cancelar pedido' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
