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
  Hash,
  Landmark,
  Mail,
  MapPin,
  PackageCheck,
  Printer,
  ReceiptText,
  Store,
  Trash2,
  Truck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { EstadoBadge, IconoEntrega } from '@/components/badges';
import { PanelEnLinea } from '@/components/panel-en-linea';
import { Vacio } from '@/components/vacio';
import { LogoMarca } from '@/components/logo';
import { useConfirmar } from '@/components/confirmar';
import { notificarCambio } from '@/components/layout';
import { useApi, useCatalogos } from '@/hooks/use-api';
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
// Retiro en tienda: no hay envio, del pago pasa directo a entregado
const PASOS_RETIRO = [PASOS[0], PASOS[1], { estado: 'ENTREGADA', titulo: 'Retirado', icono: Store }];

const pasosDe = (orden) => (orden.metodoEntrega === 'RETIRO_TIENDA' ? PASOS_RETIRO : PASOS);

const TITULO_CAMBIO = {
  PAGADA: { titulo: 'Registrar pago', descripcion: 'Indica cómo pagó el cliente. Solo el número de referencia, sin texto adicional.', icono: CreditCard },
  ENVIADA: { titulo: 'Despachar pedido', descripcion: 'Registra la empresa de envío y el número de guía para hacer seguimiento.', icono: Truck },
  ENTREGADA: { titulo: 'Confirmar entrega', descripcion: 'El pedido quedará cerrado como entregado.', icono: PackageCheck },
  CANCELADA: { titulo: 'Cancelar pedido', descripcion: 'Las unidades de este pedido volverán al inventario. Esta acción no se puede deshacer.', icono: Ban },
};

const ICONO_HISTORIAL = { PENDIENTE: ReceiptText, PAGADA: CircleDollarSign, ENVIADA: Truck, ENTREGADA: CheckCircle2, CANCELADA: Ban };

function Progreso({ orden }) {
  const cancelada = orden.estado === 'CANCELADA';
  const pasos = pasosDe(orden);
  const actual = pasos.findIndex((p) => p.estado === orden.estado);
  return (
    <ol className={cn('grid', pasos.length === 3 ? 'grid-cols-3' : 'grid-cols-4')}>
      {pasos.map((p, i) => {
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
              <span className={cn('h-0.5 flex-1', i === pasos.length - 1 ? 'opacity-0' : !cancelada && i < actual ? 'bg-primary' : 'bg-border')} />
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
          <p>
            {orden.metodoEntregaNombre}
            {orden.empresaEnvioNombre && ` · ${orden.empresaEnvioNombre}`}
            {orden.numeroGuia && ` · Guía ${orden.numeroGuia}`}
          </p>
          {orden.direccionEnvio && <p>{orden.direccionEnvio}</p>}
          <p>
            Pago: {METODOS_PAGO[orden.metodoPago]}
            {orden.pagoBancoNombre && ` · ${orden.pagoBancoNombre}`}
            {orden.pagoReferencia && ` · Ref. ${orden.pagoReferencia}`}
          </p>
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

// Formulario del cambio de estado, integrado en la pagina (debajo del encabezado del pedido).
// Cada paso pide sus propios datos en campos separados, asi la base de datos queda ordenada.
function CambioEstado({ orden, estado, onCerrar, onHecho }) {
  const catalogos = useCatalogos();
  const [d, setD] = useState({
    metodoPago: orden.metodoPago ?? 'EFECTIVO',
    banco: '',
    referencia: '',
    empresaEnvio: orden.empresaEnvio ?? '',
    numeroGuia: '',
    recibidoPor: orden.metodoEntrega === 'RETIRO_TIENDA' ? '' : orden.usuarioNombre ?? '',
    nota: '',
  });
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const poner = (k) => (v) => setD((x) => ({ ...x, [k]: v?.target ? v.target.value : v }));

  const metodo = catalogos?.metodosPago.find((m) => m.valor === d.metodoPago);
  const envioNacional = orden.metodoEntrega === 'ENVIO_NACIONAL';
  const info = TITULO_CAMBIO[estado];

  const enviar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo = { estado, nota: d.nota };
    if (estado === 'PAGADA') Object.assign(cuerpo, { metodoPago: d.metodoPago, banco: metodo?.pideBanco ? d.banco : null, referencia: metodo?.pideReferencia ? d.referencia : null });
    if (estado === 'ENVIADA' && envioNacional) Object.assign(cuerpo, { empresaEnvio: d.empresaEnvio || null, numeroGuia: d.numeroGuia });
    if (estado === 'ENTREGADA') cuerpo.recibidoPor = d.recibidoPor;
    try {
      await api(`/ordenes/${orden.id}/estado`, { method: 'PATCH', body: cuerpo });
      toast.success(`${orden.codigo}: ${ESTADOS[estado].etiqueta.toLowerCase()}`, {
        description: estado === 'CANCELADA' ? 'El stock de los productos fue devuelto al inventario.' : undefined,
      });
      onHecho();
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <PanelEnLinea
      icono={info.icono}
      titulo={`${info.titulo} · ${orden.codigo}`}
      descripcion={info.descripcion}
      onCerrar={onCerrar}
      className={estado === 'CANCELADA' ? 'border-destructive/40 ring-destructive/5' : undefined}
    >
      <form onSubmit={enviar} className="grid gap-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <FieldGroup className="grid gap-4 md:grid-cols-3">
          {estado === 'PAGADA' && (
            <>
              <Field>
                <FieldLabel>Método de pago</FieldLabel>
                <Select value={d.metodoPago} onValueChange={poner('metodoPago')}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(catalogos?.metodosPago ?? Object.entries(METODOS_PAGO).map(([valor, nombre]) => ({ valor, nombre }))).map((m) => (
                      <SelectItem key={m.valor} value={m.valor}>
                        {m.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {d.metodoPago !== orden.metodoPago && <FieldDescription>El cliente había indicado {METODOS_PAGO[orden.metodoPago]}.</FieldDescription>}
              </Field>
              {metodo?.pideBanco && (
                <Field>
                  <FieldLabel>Banco de origen</FieldLabel>
                  <Select value={d.banco} onValueChange={poner('banco')} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona el banco" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {catalogos.bancos.map((b) => (
                        <SelectItem key={b.codigo} value={b.codigo}>
                          <span className="w-9 text-xs text-muted-foreground tabular">{b.codigo}</span> {b.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              {metodo?.pideReferencia && (
                <Field>
                  <FieldLabel htmlFor="ref-pago">{d.metodoPago === 'TARJETA' ? 'Número de aprobación' : d.metodoPago === 'ZELLE' ? 'Código de confirmación' : 'Número de referencia'}</FieldLabel>
                  <Input
                    id="ref-pago"
                    value={d.referencia}
                    onChange={(e) => poner('referencia')(metodo.referenciaSoloNumeros ? e.target.value.replace(/\D/g, '') : e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                    inputMode={metodo.referenciaSoloNumeros ? 'numeric' : 'text'}
                    placeholder={metodo.referenciaSoloNumeros ? 'Ej: 004512' : 'Ej: AB12CD34'}
                    maxLength={20}
                    required
                    className="font-mono tracking-wider"
                  />
                  <FieldDescription>{metodo.referenciaSoloNumeros ? 'Solo números.' : 'Letras y números.'}</FieldDescription>
                </Field>
              )}
              {metodo && !metodo.pideReferencia && <p className="self-center text-sm text-muted-foreground md:col-span-2">Pago en efectivo: no requiere referencia.</p>}
            </>
          )}

          {estado === 'ENVIADA' &&
            (envioNacional ? (
              <>
                <Field className="md:col-span-2">
                  <FieldLabel>Empresa de envío</FieldLabel>
                  <ToggleGroup type="single" variant="outline" value={d.empresaEnvio} onValueChange={(v) => v && poner('empresaEnvio')(v)} className="w-full flex-wrap">
                    {(catalogos?.empresasEnvio ?? []).map((e) => (
                      <ToggleGroupItem key={e.valor} value={e.valor} className="flex-1 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary">
                        {e.nombre}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  {orden.empresaEnvio && d.empresaEnvio !== orden.empresaEnvio && <FieldDescription>El cliente había elegido {orden.empresaEnvioNombre}.</FieldDescription>}
                </Field>
                <Field>
                  <FieldLabel htmlFor="guia">Número de guía</FieldLabel>
                  <Input
                    id="guia"
                    value={d.numeroGuia}
                    onChange={(e) => poner('numeroGuia')(e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())}
                    placeholder="Ej: 7745120"
                    maxLength={30}
                    required
                    className="font-mono tracking-wider"
                  />
                </Field>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground md:col-span-3">
                <IconoEntrega metodo="DELIVERY" className="size-4" /> Entrega por delivery a: {orden.direccionEnvio}
              </p>
            ))}

          {estado === 'ENTREGADA' && (
            <Field className="md:col-span-2">
              <FieldLabel htmlFor="recibe">{orden.metodoEntrega === 'RETIRO_TIENDA' ? 'Retirado por' : 'Recibido por'}</FieldLabel>
              <Input id="recibe" value={d.recibidoPor} onChange={poner('recibidoPor')} placeholder="Nombre de quien recibe" maxLength={100} />
            </Field>
          )}

          <Field className={estado === 'CANCELADA' ? 'md:col-span-3' : estado === 'ENTREGADA' ? '' : 'md:col-span-3'}>
            <FieldLabel htmlFor="nota-estado">
              {estado === 'CANCELADA' ? 'Motivo de la cancelación' : 'Comentario'} {estado !== 'CANCELADA' && <span className="font-normal text-muted-foreground">(opcional)</span>}
            </FieldLabel>
            <Textarea
              id="nota-estado"
              rows={estado === 'CANCELADA' ? 2 : 1}
              value={d.nota}
              onChange={poner('nota')}
              placeholder={estado === 'CANCELADA' ? 'Ej: El cliente desistió de la compra' : 'Observación interna'}
              maxLength={300}
              required={estado === 'CANCELADA'}
              className="min-h-9"
            />
          </Field>
        </FieldGroup>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCerrar}>
            Volver
          </Button>
          <Button type="submit" variant={estado === 'CANCELADA' ? 'destructive' : 'default'} disabled={guardando || (estado === 'PAGADA' && metodo?.pideBanco && !d.banco)}>
            {guardando && <Spinner />} {estado === 'CANCELADA' ? 'Cancelar pedido' : 'Confirmar'}
          </Button>
        </div>
      </form>
    </PanelEnLinea>
  );
}

// Fila "icono + etiqueta + valor" de las tarjetas laterales
function Dato({ icono: Icono, etiqueta, children }) {
  return (
    <div className="flex gap-2.5">
      <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{etiqueta}</p>
        <div className="break-words">{children}</div>
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
  useCatalogos(); // se piden desde ya para que el formulario de pago abra completo
  const [cambio, setCambio] = useState(null); // estado al que se quiere pasar (abre el formulario)

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

  const abrirCambio = (estado) => setCambio((c) => (c === estado ? null : estado));
  const cambioHecho = () => {
    setCambio(null);
    notificarCambio();
    recargar({ silencioso: true });
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
              <Button variant={cambio === 'CANCELADA' ? 'outline' : 'destructive'} onClick={() => abrirCambio('CANCELADA')}>
                <Ban /> Cancelar
              </Button>
            )}
            {esAdmin && orden.estado === 'CANCELADA' && (
              <Button variant="destructive" onClick={eliminar}>
                <Trash2 /> Eliminar
              </Button>
            )}
            {avanzar.map((s) => (
              <Button key={s} variant={cambio === s ? 'outline' : 'default'} onClick={() => abrirCambio(s)}>
                {s === 'PAGADA' ? <CreditCard /> : s === 'ENVIADA' ? <Truck /> : <PackageCheck />}{' '}
                {s === 'ENTREGADA' && orden.metodoEntrega === 'RETIRO_TIENDA' ? 'Confirmar retiro' : ACCION_ESTADO[s]}
              </Button>
            ))}
          </div>
        </div>

        {cambio && siguientes.includes(cambio) && <CambioEstado key={cambio} orden={orden} estado={cambio} onCerrar={() => setCambio(null)} onHecho={cambioHecho} />}

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
          <div className="grid gap-4 lg:col-span-2">
          <Card>
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
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
              <CardDescription>Cada cambio de estado del pedido</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="relative ml-3 grid gap-5 border-l pl-6">
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
                      {h.detalle && <p className="mt-1 text-sm font-medium">{h.detalle}</p>}
                      {h.nota && <p className={cn('text-sm', h.detalle ? 'text-muted-foreground' : 'mt-1')}>{h.nota}</p>}
                      {h.usuario && <p className="text-xs text-muted-foreground">por {h.usuario}</p>}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
          </div>

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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pago</CardTitle>
                <CardDescription>{orden.pagoReferencia || orden.estado !== 'PENDIENTE' ? 'Datos del pago confirmado' : 'Pendiente por confirmar'}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                <Dato icono={CreditCard} etiqueta="Método">
                  {METODOS_PAGO[orden.metodoPago] ?? '—'}
                </Dato>
                {orden.pagoBancoNombre && (
                  <Dato icono={Landmark} etiqueta="Banco de origen">
                    {orden.pagoBancoNombre} <span className="text-xs text-muted-foreground">({orden.pagoBanco})</span>
                  </Dato>
                )}
                {orden.pagoReferencia && (
                  <Dato icono={Hash} etiqueta={orden.metodoPago === 'TARJETA' ? 'Aprobación' : 'Referencia'}>
                    <span className="font-mono tracking-wider">{orden.pagoReferencia}</span>
                  </Dato>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entrega</CardTitle>
                <CardDescription>{orden.metodoEntregaNombre}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {orden.empresaEnvioNombre && (
                  <Dato icono={Truck} etiqueta="Empresa de envío">
                    {orden.empresaEnvioNombre}
                  </Dato>
                )}
                {orden.numeroGuia && (
                  <Dato icono={Hash} etiqueta="Número de guía">
                    <span className="font-mono tracking-wider">{orden.numeroGuia}</span>
                  </Dato>
                )}
                {orden.direccionEnvio ? (
                  <Dato icono={MapPin} etiqueta="Dirección">
                    {orden.direccionEnvio}
                  </Dato>
                ) : (
                  <Dato icono={Store} etiqueta="Lugar de retiro">
                    Tienda MercaUJAP · Bárbula
                  </Dato>
                )}
                {orden.recibidoPor && (
                  <Dato icono={UserRound} etiqueta={orden.metodoEntrega === 'RETIRO_TIENDA' ? 'Retirado por' : 'Recibido por'}>
                    {orden.recibidoPor}
                  </Dato>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
        <p className="text-xs text-muted-foreground">Última actualización: {fecha(orden.actualizadoEn)}</p>
      </div>

    </>
  );
}
