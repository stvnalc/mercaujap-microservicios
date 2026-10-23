import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Mail, MapPin, MoreHorizontal, Pencil, Phone, Plus, Power, ReceiptText, Search, Trash2, UserCheck, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EncabezadoPagina } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TablaDatos } from '@/components/tabla-datos';
import { ActivoBadge, EstadoBadge } from '@/components/badges';
import { ClienteForm } from '@/components/cliente-form';
import { EncabezadoExpansion, PanelEnLinea } from '@/components/panel-en-linea';
import { Vacio } from '@/components/vacio';
import { useConfirmar } from '@/components/confirmar';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dinero, fecha, hace, iniciales, num } from '@/lib/format';

// Ficha del cliente que se abre DENTRO de la tabla, debajo de su fila
function DetalleCliente({ cliente, ordenes, onCerrar, onEditar }) {
  const navegar = useNavigate();
  const propias = ordenes.filter((o) => o.usuarioId === cliente.id);
  const validas = propias.filter((o) => o.estado !== 'CANCELADA');
  const gastado = validas.reduce((t, o) => t + Number(o.total), 0);
  return (
    <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="lg:col-span-2">
        <EncabezadoExpansion
          titulo={
            <span className="flex items-center gap-2">
              {cliente.nombre} <ActivoBadge activo={cliente.activo} />
            </span>
          }
          descripcion={`Cliente desde ${fecha(cliente.creado_en)}`}
          onCerrar={onCerrar}
        >
          <Button variant="outline" size="sm" onClick={() => onEditar(cliente)}>
            <Pencil /> Editar
          </Button>
          {cliente.activo && (
            <Button size="sm" asChild>
              <Link to={`/pedidos/nuevo?cliente=${cliente.id}`}>
                <Plus /> Nuevo pedido
              </Link>
            </Button>
          )}
        </EncabezadoExpansion>
      </div>
        <div className="grid content-start gap-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              [UserCheck, 'Documento', cliente.documento],
              [Mail, 'Correo', cliente.email],
              [Phone, 'Teléfono', cliente.telefono],
              [MapPin, 'Dirección', cliente.direccion],
            ].map(([Icono, t, v]) => (
              <div key={t} className="flex gap-3">
                <Icono className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <dt className="text-xs text-muted-foreground">{t}</dt>
                  <dd>{v || '—'}</dd>
                </div>
              </div>
            ))}
          </dl>
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Pedidos', num(validas.length)],
              ['Total comprado', dinero(gastado)],
              ['Ticket promedio', dinero(validas.length ? gastado / validas.length : 0)],
            ].map(([t, v]) => (
              <div key={t} className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t}</p>
                <p className="font-semibold tabular">{v}</p>
              </div>
            ))}
          </div>
        </div>
          <div className="grid content-start gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Historial de pedidos</h3>
              <span className="text-xs text-muted-foreground">{propias.length} en total</span>
            </div>
            {propias.length === 0 ? (
              <p className="text-sm text-muted-foreground">Este cliente aún no tiene pedidos.</p>
            ) : (
              <ul className="max-h-[20rem] divide-y overflow-y-auto rounded-lg border bg-background">
                {propias.map((o) => (
                  <li key={o.id}>
                    <button type="button" onClick={() => navegar(`/pedidos/${o.id}`)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{o.codigo}</p>
                        <p className="text-xs text-muted-foreground">
                          {hace(o.fecha)} · {o.unidades} u.
                        </p>
                      </div>
                      <EstadoBadge estado={o.estado} />
                      <span className="w-20 text-right text-sm font-medium tabular">{dinero(o.total)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
    </div>
  );
}

export function Clientes() {
  const { esAdmin } = useAuth();
  const confirmar = useConfirmar();
  const [params, setParams] = useSearchParams();
  const { datos: clientes, cargando, recargar } = useApi('/usuarios?tipo=clientes');
  const { datos: ordenesApi } = useApi('/ordenes');
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [creando, setCreando] = useState(false);

  const ordenes = ordenesApi ?? [];
  const lista = clientes ?? [];
  // ?id=5 abre la ficha del cliente dentro de la tabla; &editar=1 abre su formulario ahi mismo
  const seleccionado = lista.find((c) => String(c.id) === params.get('id')) ?? null;
  const editando = !!seleccionado && params.get('editar') === '1';
  const abrir = (c, editar = false) => setParams(editar ? { id: c.id, editar: '1' } : { id: c.id }, { replace: true });
  const cerrar = () => setParams({}, { replace: true });

  const compras = useMemo(() => {
    const m = {};
    for (const o of ordenes) {
      if (o.estado === 'CANCELADA') continue;
      const c = (m[o.usuarioId] ??= { pedidos: 0, total: 0, ultima: null });
      c.pedidos++;
      c.total += Number(o.total);
      if (!c.ultima || o.fecha > c.ultima) c.ultima = o.fecha;
    }
    return m;
  }, [ordenes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(
      (c) =>
        (filtro === 'todos' || (filtro === 'activos' ? c.activo : !c.activo)) &&
        (!q || `${c.nombre} ${c.email} ${c.documento ?? ''} ${c.telefono ?? ''}`.toLowerCase().includes(q))
    );
  }, [lista, busqueda, filtro]);

  const conCompras = Object.keys(compras).length;
  const nuevosMes = lista.filter((c) => c.creado_en && Date.now() - new Date(c.creado_en) < 30 * 864e5).length;

  const alternarActivo = async (c) => {
    try {
      await api(`/usuarios/${c.id}`, { method: 'PUT', body: { activo: !c.activo } });
      toast.success(c.activo ? 'Cliente desactivado' : 'Cliente activado', { description: c.nombre });
      recargar({ silencioso: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const eliminar = async (c) => {
    const ok = await confirmar({
      titulo: `¿Eliminar a ${c.nombre}?`,
      descripcion: 'Solo se pueden eliminar clientes sin pedidos. Si tiene pedidos, desactívalo en su lugar.',
      accion: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    try {
      await api(`/usuarios/${c.id}`, { method: 'DELETE' });
      toast.success('Cliente eliminado');
      if (seleccionado?.id === c.id) cerrar();
      recargar({ silencioso: true });
    } catch (e) {
      toast.error('No se pudo eliminar', { description: e.message });
    }
  };

  const columnas = [
    {
      id: 'nombre',
      titulo: 'Cliente',
      valor: (c) => c.nombre,
      celda: (c) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{iniciales(c.nombre)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="max-w-56 truncate font-medium">{c.nombre}</p>
            <p className="max-w-56 truncate text-xs text-muted-foreground">{c.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'documento', titulo: 'Documento', className: 'hidden md:table-cell', valor: (c) => c.documento, celda: (c) => c.documento ?? '—' },
    { id: 'telefono', titulo: 'Teléfono', className: 'hidden lg:table-cell', celda: (c) => <span className="text-muted-foreground">{c.telefono ?? '—'}</span> },
    { id: 'pedidos', titulo: 'Pedidos', alinear: 'right', valor: (c) => compras[c.id]?.pedidos ?? 0, celda: (c) => num(compras[c.id]?.pedidos ?? 0) },
    { id: 'total', titulo: 'Total comprado', alinear: 'right', className: 'hidden sm:table-cell', valor: (c) => compras[c.id]?.total ?? 0, celda: (c) => <span className="font-medium">{dinero(compras[c.id]?.total ?? 0)}</span> },
    { id: 'estado', titulo: 'Estado', className: 'hidden sm:table-cell', valor: (c) => (c.activo ? 1 : 0), celda: (c) => <ActivoBadge activo={c.activo} /> },
    {
      id: 'acciones',
      titulo: <span className="sr-only">Acciones</span>,
      className: 'w-10',
      celda: (c) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => abrir(c)}>
                <ReceiptText /> Ver pedidos
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => abrir(c, true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => alternarActivo(c)}>
                <Power /> {c.activo ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
              {esAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => eliminar(c)}>
                    <Trash2 /> Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <>
      <EncabezadoPagina titulo="Clientes" descripcion="Personas y empresas que compran en la tienda.">
        <Button onClick={() => setCreando((v) => !v)} variant={creando ? 'outline' : 'default'}>
          {creando ? <X /> : <UserPlus />} {creando ? 'Cerrar formulario' : 'Nuevo cliente'}
        </Button>
      </EncabezadoPagina>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Clientes registrados" icono={Users} cargando={!clientes} valor={num(lista.length)} detalle={`${lista.filter((c) => c.activo).length} activos`} />
        <StatCard titulo="Con compras" icono={ReceiptText} cargando={!clientes || !ordenesApi} valor={num(conCompras)} detalle={lista.length ? `${Math.round((conCompras / lista.length) * 100)}% de la cartera` : ''} />
        <StatCard titulo="Nuevos (30 días)" icono={UserPlus} cargando={!clientes} valor={num(nuevosMes)} detalle="Registrados recientemente" />
      </div>
      {creando && (
        <PanelEnLinea icono={UserPlus} titulo="Nuevo cliente" descripcion="Registra un cliente para poder asignarle pedidos." onCerrar={() => setCreando(false)}>
          <ClienteForm
            onCancelar={() => setCreando(false)}
            onGuardado={(c) => {
              setCreando(false);
              recargar({ silencioso: true });
              abrir(c);
            }}
          />
        </PanelEnLinea>
      )}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <InputGroup className="sm:max-w-xs">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput placeholder="Nombre, correo, cédula o teléfono" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </InputGroup>
            <Tabs value={filtro} onValueChange={setFiltro}>
              <TabsList>
                <TabsTrigger value="todos" className="px-3">Todos</TabsTrigger>
                <TabsTrigger value="activos" className="px-3">Activos</TabsTrigger>
                <TabsTrigger value="inactivos" className="px-3">Inactivos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <TablaDatos
            columnas={columnas}
            filas={filtrados}
            cargando={cargando}
            onFila={(c) => (seleccionado?.id === c.id ? cerrar() : abrir(c))}
            tema="usuarios"
            expandida={seleccionado?.id}
            expansion={(c) =>
              editando ? (
                <>
                  <EncabezadoExpansion titulo={`Editar a ${c.nombre}`} descripcion="Actualiza los datos del cliente." onCerrar={cerrar} />
                  <ClienteForm
                    key={c.id}
                    cliente={c}
                    onCancelar={() => abrir(c)}
                    onGuardado={() => {
                      recargar({ silencioso: true });
                      abrir(c);
                    }}
                  />
                </>
              ) : (
                <DetalleCliente cliente={c} ordenes={ordenes} onCerrar={cerrar} onEditar={(x) => abrir(x, true)} />
              )
            }
            vacio={<Vacio icono={Users} titulo="No hay clientes" descripcion="Prueba con otra búsqueda o registra un cliente." />}
          />
        </CardContent>
      </Card>
    </>
  );
}
