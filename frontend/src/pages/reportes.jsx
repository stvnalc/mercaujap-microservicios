import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { startOfMonth, subDays, subMonths, endOfMonth } from 'date-fns';
import { ArrowLeft, Download, FileBarChart, FilePlus2, Printer, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EncabezadoPagina } from '@/components/page-header';
import { TablaDatos } from '@/components/tabla-datos';
import { Vacio } from '@/components/vacio';
import { PanelEnLinea } from '@/components/panel-en-linea';
import { useConfirmar } from '@/components/confirmar';
import { useApi } from '@/hooks/use-api';
import { api, descargar } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dinero, dineroCorto, diaCorto, ESTADOS, fecha, fechaHora, fechaLarga, isoDia, METODOS_PAGO, num, porcentaje } from '@/lib/format';

const hoy = () => new Date();
const RANGOS = {
  '7d': { etiqueta: '7 días', rango: () => [subDays(hoy(), 6), hoy()] },
  '30d': { etiqueta: '30 días', rango: () => [subDays(hoy(), 29), hoy()] },
  mes: { etiqueta: 'Este mes', rango: () => [startOfMonth(hoy()), hoy()] },
  anterior: { etiqueta: 'Mes anterior', rango: () => [startOfMonth(subMonths(hoy(), 1)), endOfMonth(subMonths(hoy(), 1))] },
};

// Formulario para generar un reporte, integrado en la pagina
function GenerarForm({ onCancelar, onCreado }) {
  const [rango, setRango] = useState('30d');
  const [desde, setDesde] = useState(isoDia(subDays(hoy(), 29)));
  const [hasta, setHasta] = useState(isoDia(hoy()));
  const [titulo, setTitulo] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const elegirRango = (v) => {
    if (!v) return;
    setRango(v);
    const [d, h] = RANGOS[v].rango();
    setDesde(isoDia(d));
    setHasta(isoDia(h));
  };

  const generar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      const r = await api('/reportes', { method: 'POST', body: { titulo, desde, hasta } });
      toast.success('Reporte generado', { description: r.titulo });
      onCreado(r);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={generar} className="grid gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="grid gap-4 lg:grid-cols-[auto_1fr_1fr_2fr] lg:items-end">
        <Field>
          <FieldLabel>Período</FieldLabel>
          <ToggleGroup type="single" variant="outline" size="sm" value={rango} onValueChange={elegirRango} className="h-9 w-full">
            {Object.entries(RANGOS).map(([k, r]) => (
              <ToggleGroupItem key={k} value={k} className="h-9 flex-1 px-3 text-xs">
                {r.etiqueta}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor="rep-desde">Desde</FieldLabel>
          <Input id="rep-desde" type="date" value={desde} max={hasta} onChange={(e) => (setDesde(e.target.value), setRango(''))} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="rep-hasta">Hasta</FieldLabel>
          <Input id="rep-hasta" type="date" value={hasta} min={desde} onChange={(e) => (setHasta(e.target.value), setRango(''))} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="rep-titulo">
            Título <span className="font-normal text-muted-foreground">(opcional)</span>
          </FieldLabel>
          <Input id="rep-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Cierre de octubre" maxLength={120} />
        </Field>
      </FieldGroup>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Spinner />} Generar reporte
        </Button>
      </div>
    </form>
  );
}

export function Reportes() {
  const navegar = useNavigate();
  const { datos: reportes, cargando } = useApi('/reportes');
  const [abierto, setAbierto] = useState(false);

  const columnas = [
    {
      id: 'titulo',
      titulo: 'Reporte',
      valor: (r) => r.id,
      celda: (r) => (
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileBarChart className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="max-w-72 truncate font-medium">{r.titulo || `Reporte #${r.id}`}</p>
            <p className="text-xs text-muted-foreground">
              {fecha(r.desde)} – {fecha(r.hasta)}
            </p>
          </div>
        </div>
      ),
    },
    { id: 'creado', titulo: 'Generado', className: 'hidden md:table-cell', valor: (r) => r.creadoEn, celda: (r) => <span className="text-sm text-muted-foreground">{fechaHora(r.creadoEn)} · {r.generadoPor}</span> },
    { id: 'pedidos', titulo: 'Pedidos', alinear: 'right', className: 'hidden sm:table-cell', valor: (r) => r.totalOrdenes, celda: (r) => num(r.totalOrdenes) },
    { id: 'ganancia', titulo: 'Ganancia', alinear: 'right', className: 'hidden lg:table-cell', valor: (r) => r.gananciaBruta, celda: (r) => dinero(r.gananciaBruta) },
    { id: 'ventas', titulo: 'Ventas', alinear: 'right', valor: (r) => r.totalVentas, celda: (r) => <span className="font-medium">{dinero(r.totalVentas)}</span> },
  ];

  return (
    <>
      <EncabezadoPagina titulo="Reportes" descripcion="Reportes guardados del desempeño de la tienda. Puedes descargarlos en Excel (CSV) o imprimirlos.">
        <Button onClick={() => setAbierto((v) => !v)} variant={abierto ? 'outline' : 'default'}>
          {abierto ? <X /> : <FilePlus2 />} {abierto ? 'Cerrar formulario' : 'Generar reporte'}
        </Button>
      </EncabezadoPagina>
      {abierto && (
        <PanelEnLinea icono={FilePlus2} titulo="Generar reporte" descripcion="Se guarda una foto de las ventas, el inventario y los clientes del período elegido." onCerrar={() => setAbierto(false)} enfocar={false}>
          <GenerarForm onCancelar={() => setAbierto(false)} onCreado={(r) => navegar(`/reportes/${r.id}`)} />
        </PanelEnLinea>
      )}
      <Card>
        <CardContent>
          <TablaDatos
            columnas={columnas}
            filas={reportes}
            cargando={cargando}
            tema="reportes"
            onFila={(r) => navegar(`/reportes/${r.id}`)}
            vacio={
              <Vacio icono={FileBarChart} titulo="Aún no hay reportes" descripcion="Genera el primero para guardar una foto del negocio.">
                <Button onClick={() => setAbierto(true)}>
                  <FilePlus2 /> Generar reporte
                </Button>
              </Vacio>
            }
          />
        </CardContent>
      </Card>
    </>
  );
}

function Indicador({ titulo, valor, detalle }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-xl font-semibold tabular">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

function TablaSimple({ titulo, columnas, filas, vacio = 'Sin datos' }) {
  return (
    <Card className="break-inside-avoid">
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        {filas.length === 0 ? (
          <p className="text-sm text-muted-foreground">{vacio}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columnas.map((c, i) => (
                  <TableHead key={c} className={i > 0 ? 'text-right' : ''}>
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filas.map((f, i) => (
                <TableRow key={i}>
                  {f.map((v, j) => (
                    <TableCell key={j} className={j > 0 ? 'text-right tabular' : 'max-w-56 truncate'}>
                      {v}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function DetalleReporte() {
  const { id } = useParams();
  const navegar = useNavigate();
  const { esAdmin } = useAuth();
  const confirmar = useConfirmar();
  const { datos: rep, error } = useApi(`/reportes/${id}`);

  if (error) return <Vacio icono={FileBarChart} titulo="Reporte no encontrado" descripcion="Es posible que haya sido eliminado." />;
  if (!rep) return <Skeleton className="h-96 w-full" />;
  const r = rep.detalle;

  const eliminar = async () => {
    if (!(await confirmar({ titulo: '¿Eliminar este reporte?', descripcion: 'Se borrará del historial de reportes.', accion: 'Eliminar', destructivo: true }))) return;
    try {
      await api(`/reportes/${rep.id}`, { method: 'DELETE' });
      toast.success('Reporte eliminado');
      navegar('/reportes');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const bajar = () => descargar(`/reportes/${rep.id}/csv`, `reporte-${rep.id}.csv`).catch((e) => toast.error(e.message));

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button variant="outline" size="icon" asChild aria-label="Volver" className="print:hidden">
            <Link to="/reportes">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{rep.titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Del {fechaLarga(r.desde)} al {fechaLarga(r.hasta)} · generado el {fechaHora(rep.creadoEn)} por {rep.generadoPor}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 print:hidden">
          {esAdmin && (
            <Button variant="destructive" onClick={eliminar}>
              <Trash2 /> Eliminar
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> Imprimir
          </Button>
          <Button onClick={bajar}>
            <Download /> Descargar CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Indicador titulo="Ventas (con IVA)" valor={dinero(r.totalVentas)} detalle={`Netas: ${dinero(r.ventasNetas)}`} />
        <Indicador titulo="Ganancia bruta" valor={dinero(r.gananciaBruta)} detalle={`Margen ${porcentaje(r.margenBruto)}`} />
        <Indicador titulo="Pedidos" valor={num(r.totalOrdenes)} detalle={`${r.ordenesPorEstado?.CANCELADA ?? 0} cancelados`} />
        <Indicador titulo="Ticket promedio" valor={dinero(r.ticketPromedio)} detalle={`${num(r.unidadesVendidas)} unidades`} />
        <Indicador titulo="IVA recaudado" valor={dinero(r.impuestos)} />
        <Indicador titulo="Costo de ventas" valor={dinero(r.costoVentas)} />
        <Indicador titulo="Clientes que compraron" valor={num(r.clientesConCompras)} detalle={`de ${num(r.totalClientes)} registrados`} />
        <Indicador titulo="Valor del inventario" valor={dinero(r.valorInventario)} detalle={`Costo: ${dinero(r.costoInventario)}`} />
      </div>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle>Ventas por día</CardTitle>
          <CardDescription>Total diario con IVA</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ ventas: { label: 'Ventas', color: 'var(--chart-1)' } }} className="aspect-auto h-64 w-full">
            <BarChart data={r.ventasPorDia}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={diaCorto} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={dineroCorto} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(v) => fechaLarga(v)} formatter={(v) => <span className="font-medium tabular">{dinero(v)}</span>} />} />
              <Bar dataKey="ventas" fill="var(--color-ventas)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TablaSimple titulo="Productos más vendidos" columnas={['Producto', 'Unidades', 'Ingresos']} filas={r.topProductos.map((p) => [p.nombre, num(p.cantidad), dinero(p.ingresos)])} />
        <TablaSimple titulo="Mejores clientes" columnas={['Cliente', 'Pedidos', 'Total']} filas={r.topClientes.map((c) => [c.nombre, num(c.ordenes), dinero(c.gastado)])} />
        <TablaSimple titulo="Ventas por categoría" columnas={['Categoría', 'Unidades', 'Ingresos']} filas={r.ventasPorCategoria.map((c) => [c.categoria, num(c.unidades), dinero(c.ingresos)])} />
        <TablaSimple titulo="Métodos de pago" columnas={['Método', 'Pedidos', 'Total']} filas={r.ventasPorMetodoPago.map((m) => [METODOS_PAGO[m.metodo] ?? m.metodo, num(m.ordenes), dinero(m.total)])} />
        {r.ventasPorEntrega && (
          <TablaSimple titulo="Formas de entrega" columnas={['Entrega', 'Pedidos', 'Total']} filas={r.ventasPorEntrega.map((m) => [m.metodo, num(m.ordenes), dinero(m.total)])} />
        )}
        <TablaSimple
          titulo="Pedidos por estado"
          columnas={['Estado', 'Pedidos']}
          filas={Object.entries(ESTADOS).map(([k, e]) => [e.etiqueta, num(r.ordenesPorEstado?.[k] ?? 0)])}
        />
        <TablaSimple
          titulo="Productos para reponer"
          columnas={['Producto', 'Stock', 'Mínimo']}
          vacio="Ningún producto estaba bajo su mínimo."
          filas={r.stockBajo.map((p) => [p.nombre, num(p.stock), num(p.stockMinimo)])}
        />
      </div>
    </>
  );
}
