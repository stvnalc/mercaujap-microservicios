import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Plus, ReceiptText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { EncabezadoPagina } from '@/components/page-header';
import { TablaDatos } from '@/components/tabla-datos';
import { EstadoBadge } from '@/components/badges';
import { Vacio } from '@/components/vacio';
import { useApi } from '@/hooks/use-api';
import { dinero, ESTADOS, fecha, fechaHora, METODOS_PAGO } from '@/lib/format';

function exportarCSV(ordenes) {
  const filas = [
    ['Pedido', 'Fecha', 'Cliente', 'Documento', 'Estado', 'Método de pago', 'Unidades', 'Subtotal', 'IVA', 'Total'],
    ...ordenes.map((o) => [
      o.codigo, fechaHora(o.fecha), o.usuarioNombre, o.usuarioDocumento ?? '', ESTADOS[o.estado]?.etiqueta ?? o.estado,
      METODOS_PAGO[o.metodoPago] ?? '', o.unidades, o.subtotal, o.impuesto, o.total,
    ]),
  ];
  const csv = '﻿' + filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `pedidos-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

export function ListaPedidos() {
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const estado = params.get('estado') ?? 'TODOS';
  const [busqueda, setBusqueda] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const ruta = `/ordenes?${new URLSearchParams({ ...(desde && { desde }), ...(hasta && { hasta }) })}`;
  const { datos: ordenes, cargando } = useApi(ruta);

  const conteo = useMemo(() => {
    const c = { TODOS: ordenes?.length ?? 0 };
    for (const o of ordenes ?? []) c[o.estado] = (c[o.estado] ?? 0) + 1;
    return c;
  }, [ordenes]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (ordenes ?? []).filter(
      (o) =>
        (estado === 'TODOS' || o.estado === estado) &&
        (!q || o.codigo?.toLowerCase().includes(q) || o.usuarioNombre?.toLowerCase().includes(q) || o.usuarioDocumento?.toLowerCase().includes(q))
    );
  }, [ordenes, estado, busqueda]);

  const columnas = [
    {
      id: 'codigo',
      titulo: 'Pedido',
      valor: (o) => o.id,
      celda: (o) => (
        <div>
          <p className="font-medium">{o.codigo}</p>
          <p className="text-xs text-muted-foreground">{fecha(o.fecha)}</p>
        </div>
      ),
    },
    {
      id: 'cliente',
      titulo: 'Cliente',
      valor: (o) => o.usuarioNombre,
      celda: (o) => (
        <div className="max-w-56">
          <p className="truncate">{o.usuarioNombre}</p>
          <p className="truncate text-xs text-muted-foreground">{o.usuarioDocumento ?? o.usuarioEmail}</p>
        </div>
      ),
    },
    {
      id: 'productos',
      titulo: 'Productos',
      className: 'hidden lg:table-cell',
      celda: (o) => (
        <div className="max-w-64">
          <p className="truncate text-sm">{o.items.map((i) => i.productoNombre).join(', ')}</p>
          <p className="text-xs text-muted-foreground">{o.unidades} unidad(es)</p>
        </div>
      ),
    },
    { id: 'pago', titulo: 'Pago', className: 'hidden md:table-cell', celda: (o) => <span className="text-sm text-muted-foreground">{METODOS_PAGO[o.metodoPago] ?? '—'}</span> },
    { id: 'estado', titulo: 'Estado', valor: (o) => o.estado, celda: (o) => <EstadoBadge estado={o.estado} /> },
    { id: 'total', titulo: 'Total', alinear: 'right', valor: (o) => Number(o.total), celda: (o) => <span className="font-medium">{dinero(o.total)}</span> },
  ];

  return (
    <>
      <EncabezadoPagina titulo="Pedidos" descripcion="Gestiona las ventas de la tienda: pagos, despachos y entregas.">
        <Button variant="outline" onClick={() => exportarCSV(filtradas)} disabled={!filtradas.length}>
          <Download /> Exportar
        </Button>
        <Button asChild>
          <Link to="/pedidos/nuevo">
            <Plus /> Nuevo pedido
          </Link>
        </Button>
      </EncabezadoPagina>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={estado} onValueChange={(v) => setParams(v === 'TODOS' ? {} : { estado: v })}>
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList>
                {['TODOS', ...Object.keys(ESTADOS)].map((e) => (
                  <TabsTrigger key={e} value={e} className="gap-1.5 px-2.5">
                    {e === 'TODOS' ? 'Todos' : ESTADOS[e].etiqueta}
                    <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular">{conteo[e] ?? 0}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <InputGroup className="sm:max-w-xs">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput placeholder="Buscar por código, cliente o cédula" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </InputGroup>
            <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
              <span>Desde</span>
              <Input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className="w-auto" />
              <span>hasta</span>
              <Input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className="w-auto" />
            </div>
          </div>
          <TablaDatos
            columnas={columnas}
            filas={filtradas}
            cargando={cargando}
            onFila={(o) => navegar(`/pedidos/${o.id}`)}
            vacio={
              <Vacio icono={ReceiptText} titulo="No hay pedidos" descripcion={busqueda || estado !== 'TODOS' ? 'Prueba con otros filtros.' : 'Registra el primer pedido.'} />
            }
          />
        </CardContent>
      </Card>
    </>
  );
}
