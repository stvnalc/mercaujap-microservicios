import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { ArrowRight, CircleDollarSign, PackageCheck, Plus, ReceiptText, TrendingUp, TriangleAlert, Wallet } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/stat-card';
import { EstadoBadge, StockBadge } from '@/components/badges';
import { Vacio } from '@/components/vacio';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth';
import { dinero, dineroCorto, diaCorto, ESTADOS, fechaLarga, hace, isoDia, num, porcentaje } from '@/lib/format';

const PERIODOS = { 7: 'Últimos 7 días', 30: 'Últimos 30 días', 90: 'Últimos 90 días' };

const variacion = (actual, anterior) => (anterior > 0 ? (actual - anterior) / anterior : null);

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export function Dashboard() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const [dias, setDias] = useState('30');
  const hoy = new Date();
  const ruta = `/reportes/resumen?desde=${isoDia(subDays(hoy, Number(dias) - 1))}&hasta=${isoDia(hoy)}`;
  const { datos: r, cargando } = useApi(ruta);
  const { datos: ordenes } = useApi('/ordenes');

  const estados = useMemo(
    () =>
      r
        ? Object.entries(ESTADOS)
            .map(([clave, e]) => ({ estado: clave, nombre: e.etiqueta, cantidad: r.ordenesPorEstado?.[clave] ?? 0, fill: e.color }))
            .filter((e) => e.cantidad > 0)
        : [],
    [r]
  );
  const configEstados = Object.fromEntries(Object.entries(ESTADOS).map(([k, e]) => [k, { label: e.etiqueta, color: e.color }]));
  const maxTop = Math.max(1, ...(r?.topProductos ?? []).map((p) => p.ingresos));
  // Sin el catalogo no se conocen los costos, asi que la ganancia no se puede calcular
  const sinCatalogo = r?.serviciosNoDisponibles?.includes('Productos');

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{format(hoy, "EEEE, d 'de' MMMM", { locale: es })}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {saludo()}, {usuario?.nombre?.split(' ')[0]}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup type="single" variant="outline" size="sm" value={dias} onValueChange={(v) => v && setDias(v)}>
            <ToggleGroupItem value="7">7 días</ToggleGroupItem>
            <ToggleGroupItem value="30">30 días</ToggleGroupItem>
            <ToggleGroupItem value="90">90 días</ToggleGroupItem>
          </ToggleGroup>
          <Button asChild>
            <Link to="/pedidos/nuevo">
              <Plus /> Nuevo pedido
            </Link>
          </Button>
        </div>
      </div>

      {r?.serviciosNoDisponibles?.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Datos incompletos</AlertTitle>
          <AlertDescription>No respondieron: {r.serviciosNoDisponibles.join(', ')}. Las cifras pueden no estar completas.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Ventas"
          icono={CircleDollarSign}
          cargando={cargando}
          valor={dinero(r?.totalVentas)}
          variacion={r && variacion(r.totalVentas, r.ventasPeriodoAnterior)}
          detalle="vs. período anterior"
        />
        <StatCard
          titulo="Pedidos"
          icono={ReceiptText}
          cargando={cargando}
          valor={num(r?.totalOrdenes)}
          variacion={r && variacion(r.totalOrdenes - (r.ordenesPorEstado?.CANCELADA ?? 0), r.ordenesPeriodoAnterior)}
          detalle={r ? `${r.ordenesPorDespachar} por despachar` : ''}
        />
        <StatCard titulo="Ticket promedio" icono={Wallet} cargando={cargando} valor={dinero(r?.ticketPromedio)} detalle={r ? `${num(r.unidadesVendidas)} unidades vendidas` : ''} />
        <StatCard
          titulo="Ganancia bruta"
          icono={TrendingUp}
          cargando={cargando}
          valor={sinCatalogo ? '—' : dinero(r?.gananciaBruta)}
          detalle={!r ? '' : sinCatalogo ? 'No disponible por el momento' : `Margen de ${porcentaje(r.margenBruto)} sobre ventas netas`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ventas diarias</CardTitle>
            <CardDescription>{PERIODOS[dias]} · total con IVA</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando && !r ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ChartContainer config={{ ventas: { label: 'Ventas', color: 'var(--chart-1)' } }} className="aspect-auto h-64 w-full">
                <AreaChart data={r?.ventasPorDia ?? []} margin={{ left: 4, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="relleno-ventas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-ventas)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-ventas)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="fecha" tickLine={false} axisLine={false} tickMargin={8} minTickGap={28} tickFormatter={diaCorto} />
                  <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={dineroCorto} />
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        labelFormatter={(v) => fechaLarga(v)}
                        formatter={(valor, _n, item) => (
                          <div className="flex w-full items-center justify-between gap-4">
                            <span className="text-muted-foreground">{item.payload.ordenes} pedido(s)</span>
                            <span className="font-medium tabular">{dinero(valor)}</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Area dataKey="ventas" type="monotone" fill="url(#relleno-ventas)" stroke="var(--color-ventas)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos por estado</CardTitle>
            <CardDescription>{PERIODOS[dias]}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {cargando && !r ? (
              <Skeleton className="mx-auto size-48 rounded-full" />
            ) : estados.length === 0 ? (
              <Vacio icono={ReceiptText} titulo="Sin pedidos" descripcion="No hay pedidos en este período." />
            ) : (
              <>
                <ChartContainer config={configEstados} className="mx-auto aspect-square h-48">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="estado" />} />
                    <Pie data={estados} dataKey="cantidad" nameKey="estado" innerRadius={58} strokeWidth={4} paddingAngle={2}>
                      {estados.map((e) => (
                        <Cell key={e.estado} fill={e.fill} />
                      ))}
                      <Label
                        content={({ viewBox }) =>
                          viewBox?.cx != null && (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">
                                {r.totalOrdenes}
                              </tspan>
                              <tspan x={viewBox.cx} y={viewBox.cy + 20} className="fill-muted-foreground text-xs">
                                pedidos
                              </tspan>
                            </text>
                          )
                        }
                      />
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {estados.map((e) => (
                    <li key={e.estado} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className="size-2.5 rounded-sm" style={{ background: e.fill }} />
                        {e.nombre}
                      </span>
                      <span className="font-medium tabular">{e.cantidad}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por categoría</CardTitle>
            <CardDescription>Ingresos netos (sin IVA)</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando && !r ? (
              <Skeleton className="h-64 w-full" />
            ) : !r?.ventasPorCategoria?.length ? (
              <Vacio icono={PackageCheck} titulo="Sin ventas" descripcion="Aún no hay ventas en este período." />
            ) : (
              <ChartContainer config={{ ingresos: { label: 'Ingresos', color: 'var(--chart-2)' } }} className="aspect-auto h-64 w-full">
                <BarChart data={r.ventasPorCategoria} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={dineroCorto} />
                  <YAxis type="category" dataKey="categoria" tickLine={false} axisLine={false} width={104} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(v) => <span className="font-medium tabular">{dinero(v)}</span>} />} />
                  <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={6} barSize={18} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Productos más vendidos</CardTitle>
            <CardDescription>Por ingresos en el período</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/productos">
                  Catálogo <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {cargando && !r ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : !r?.topProductos?.length ? (
              <Vacio icono={PackageCheck} titulo="Sin ventas" descripcion="Aún no hay ventas en este período." />
            ) : (
              <ol className="space-y-4">
                {r.topProductos.map((p, i) => (
                  <li key={p.productoId} className="flex items-center gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">{i + 1}</span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate font-medium">{p.nombre}</span>
                        <span className="shrink-0 tabular">{dinero(p.ingresos)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(p.ingresos / maxTop) * 100} className="h-1.5" />
                        <span className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular">{p.cantidad} u.</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pedidos recientes</CardTitle>
            <CardDescription>Los últimos movimientos de venta</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/pedidos">
                  Ver todos <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0">
            {!ordenes ? (
              <div className="space-y-3 px-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : ordenes.length === 0 ? (
              <Vacio icono={ReceiptText} titulo="Sin pedidos" descripcion="Registra el primer pedido de la tienda." />
            ) : (
              <ul className="divide-y">
                {ordenes.slice(0, 6).map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => navegar(`/pedidos/${o.id}`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{o.usuarioNombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.codigo} · {hace(o.fecha)}
                        </p>
                      </div>
                      <EstadoBadge estado={o.estado} className="hidden sm:inline-flex" />
                      <span className="w-24 text-right text-sm font-medium tabular">{dinero(o.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Para reponer</CardTitle>
            <CardDescription>Productos en o bajo su stock mínimo</CardDescription>
          </CardHeader>
          <CardContent>
            {cargando && !r ? (
              <Skeleton className="h-40 w-full" />
            ) : !r?.stockBajo?.length ? (
              <Vacio icono={PackageCheck} titulo="Inventario en orden" descripcion="Ningún producto está por debajo de su mínimo." />
            ) : (
              <ul className="space-y-3">
                {r.stockBajo.slice(0, 6).map((p) => (
                  <li key={p.id ?? p._id}>
                    <Link to={`/productos?id=${p._id}`} className="flex items-center justify-between gap-3 rounded-md text-sm hover:text-primary">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground tabular">
                          {p.stock} en stock · mínimo {p.stockMinimo}
                        </span>
                      </span>
                      <StockBadge estado={p.stock <= 0 ? 'agotado' : 'bajo'} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
