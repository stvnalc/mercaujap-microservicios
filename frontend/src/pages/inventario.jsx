import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowUpFromLine, Boxes, ClipboardCheck, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EncabezadoPagina } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TablaDatos } from '@/components/tabla-datos';
import { Vacio } from '@/components/vacio';
import { useApi, useDebounce } from '@/hooks/use-api';
import { fechaHora, num } from '@/lib/format';
import { cn } from '@/lib/utils';

const TIPOS = {
  entrada: { etiqueta: 'Entrada', icono: ArrowDownToLine, clase: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  salida: { etiqueta: 'Salida', icono: ArrowUpFromLine, clase: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300' },
  ajuste: { etiqueta: 'Ajuste', icono: ClipboardCheck, clase: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300' },
};

export function Inventario() {
  const [tipo, setTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const q = useDebounce(busqueda.trim());
  const params = new URLSearchParams({ limit: '500', ...(tipo !== 'todos' && { tipo }), ...(q && { q }) });
  const { datos: movimientos, cargando } = useApi(`/movimientos?${params}`);

  const totales = useMemo(() => {
    const t = { entradas: 0, salidas: 0, ventas: 0 };
    for (const m of movimientos ?? []) {
      if (m.cantidad > 0) t.entradas += m.cantidad;
      else t.salidas -= m.cantidad;
      if (m.motivo === 'Venta') t.ventas++;
    }
    return t;
  }, [movimientos]);

  const columnas = [
    { id: 'fecha', titulo: 'Fecha', valor: (m) => m.fecha, celda: (m) => <span className="text-sm whitespace-nowrap text-muted-foreground">{fechaHora(m.fecha)}</span> },
    {
      id: 'producto',
      titulo: 'Producto',
      valor: (m) => m.productoNombre,
      celda: (m) => (
        <Link to={`/productos?id=${m.producto}`} className="block max-w-64 hover:underline" onClick={(e) => e.stopPropagation()}>
          <span className="block truncate font-medium">{m.productoNombre}</span>
          <span className="text-xs text-muted-foreground">{m.sku}</span>
        </Link>
      ),
    },
    {
      id: 'tipo',
      titulo: 'Tipo',
      valor: (m) => m.tipo,
      celda: (m) => {
        const t = TIPOS[m.tipo];
        return (
          <Badge variant="outline" className={t.clase}>
            <t.icono /> {t.etiqueta}
          </Badge>
        );
      },
    },
    {
      id: 'motivo',
      titulo: 'Motivo',
      className: 'hidden md:table-cell',
      celda: (m) => (
        <span className="text-sm">
          {m.motivo}
          {m.referencia && (
            <span className="text-muted-foreground">
              {' · '}
              {m.referencia.startsWith('PED-') ? (
                <Link to={`/pedidos/${Number(m.referencia.slice(4))}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                  {m.referencia}
                </Link>
              ) : (
                m.referencia
              )}
            </span>
          )}
        </span>
      ),
    },
    { id: 'usuario', titulo: 'Usuario', className: 'hidden lg:table-cell', celda: (m) => <span className="text-sm text-muted-foreground">{m.usuario}</span> },
    {
      id: 'cantidad',
      titulo: 'Cantidad',
      alinear: 'right',
      valor: (m) => m.cantidad,
      celda: (m) => (
        <span className={cn('font-semibold', m.cantidad > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
          {m.cantidad > 0 ? '+' : ''}
          {m.cantidad}
        </span>
      ),
    },
    { id: 'saldo', titulo: 'Saldo', alinear: 'right', className: 'hidden sm:table-cell', celda: (m) => <span className="text-muted-foreground">{m.stockNuevo}</span> },
  ];

  return (
    <>
      <EncabezadoPagina titulo="Movimientos de inventario" descripcion="Cada entrada, salida y ajuste de stock queda registrado aquí (kardex)." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Unidades ingresadas" icono={ArrowDownToLine} cargando={!movimientos} valor={num(totales.entradas)} detalle="En los movimientos mostrados" />
        <StatCard titulo="Unidades despachadas" icono={ArrowUpFromLine} cargando={!movimientos} valor={num(totales.salidas)} detalle={`${num(totales.ventas)} salidas por venta`} />
        <StatCard titulo="Movimientos" icono={Boxes} cargando={!movimientos} valor={num(movimientos?.length)} detalle="Más recientes primero" />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tipo} onValueChange={setTipo}>
              <TabsList>
                <TabsTrigger value="todos" className="px-3">Todos</TabsTrigger>
                <TabsTrigger value="entrada" className="px-3">Entradas</TabsTrigger>
                <TabsTrigger value="salida" className="px-3">Salidas</TabsTrigger>
                <TabsTrigger value="ajuste" className="px-3">Ajustes</TabsTrigger>
              </TabsList>
            </Tabs>
            <InputGroup className="sm:max-w-xs">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput placeholder="Producto, SKU, pedido o motivo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </InputGroup>
          </div>
          <TablaDatos
            columnas={columnas}
            filas={movimientos}
            cargando={cargando}
            porPagina={15}
            claveFila={(m) => m._id}
            vacio={<Vacio icono={Boxes} titulo="Sin movimientos" descripcion="No hay movimientos que coincidan con los filtros." />}
          />
        </CardContent>
      </Card>
    </>
  );
}
