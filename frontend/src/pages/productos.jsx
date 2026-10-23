import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  MoreHorizontal,
  Package,
  PackageX,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { EncabezadoPagina } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { TablaDatos } from '@/components/tabla-datos';
import { StockBadge } from '@/components/badges';
import { Vacio } from '@/components/vacio';
import { EncabezadoExpansion, PanelEnLinea, useCambioExterno } from '@/components/panel-en-linea';
import { useConfirmar } from '@/components/confirmar';
import { notificarCambio } from '@/components/layout';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dinero, fechaHora, num, porcentaje } from '@/lib/format';
import { cn } from '@/lib/utils';

const VACIO = { sku: '', nombre: '', marca: '', categoria: '', precio: '', costo: '', stock: '', stockMinimo: '5', descripcion: '', activo: true };

const CAMPOS_FORM = ['sku', 'nombre', 'marca', 'categoria', 'precio', 'costo', 'stockMinimo', 'descripcion', 'activo'];
const aFormulario = (p) =>
  p ? { ...VACIO, ...p, precio: String(p.precio), costo: String(p.costo ?? ''), stockMinimo: String(p.stockMinimo ?? 5) } : VACIO;

// Formulario de crear / editar producto. Se muestra dentro de la pagina (no en una ventana encima).
function ProductoForm({ producto, categorias, onCancelar, onGuardado }) {
  const [form, setForm] = useState(() => aFormulario(producto));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const editando = !!producto?._id;
  const [cambioExterno, aceptarCambio] = useCambioExterno(producto, CAMPOS_FORM);

  const campo = (n) => ({ id: 'prod-' + n, value: form[n] ?? '', onChange: (e) => setForm((f) => ({ ...f, [n]: e.target.value })) });
  const margen = Number(form.precio) > 0 && form.costo !== '' ? (Number(form.precio) - Number(form.costo)) / Number(form.precio) : null;

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo = {
      nombre: form.nombre,
      marca: form.marca,
      categoria: form.categoria || 'General',
      descripcion: form.descripcion,
      precio: Number(form.precio),
      costo: form.costo === '' ? 0 : Number(form.costo),
      stockMinimo: Number(form.stockMinimo || 0),
      activo: form.activo,
      ...(form.sku && { sku: form.sku }),
      ...(!editando && { stock: Number(form.stock || 0) }),
    };
    try {
      const p = editando
        ? await api(`/productos/${producto._id}`, { method: 'PUT', body: cuerpo })
        : await api('/productos', { method: 'POST', body: cuerpo });
      toast.success(editando ? 'Producto actualizado' : 'Producto creado', { description: `${p.sku} · ${p.nombre}` });
      onGuardado(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={guardar} className="grid gap-5">
      {cambioExterno && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Otra persona modificó este producto</AlertTitle>
          <AlertDescription>Si guardas, tus datos reemplazarán los suyos. Puedes cargar la versión más reciente.</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => {
                setForm(aFormulario(producto));
                aceptarCambio();
              }}
            >
              Cargar cambios
            </Button>
          </AlertAction>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="grid gap-4 sm:grid-cols-6 lg:grid-cols-12">
        <Field className="sm:col-span-4 lg:col-span-5">
          <FieldLabel htmlFor="prod-nombre">Nombre</FieldLabel>
          <Input {...campo('nombre')} required minLength={2} placeholder="Ej: Laptop HP 15 Core i5" />
        </Field>
        <Field className="sm:col-span-2 lg:col-span-2">
          <FieldLabel htmlFor="prod-sku">SKU</FieldLabel>
          <Input {...campo('sku')} placeholder="Automático" className="uppercase" />
        </Field>
        <Field className="sm:col-span-3 lg:col-span-2">
          <FieldLabel htmlFor="prod-marca">Marca</FieldLabel>
          <Input {...campo('marca')} placeholder="Ej: HP" />
        </Field>
        <Field className="sm:col-span-3 lg:col-span-3">
          <FieldLabel htmlFor="prod-categoria">Categoría</FieldLabel>
          <Input {...campo('categoria')} list="lista-categorias" placeholder="Ej: Computación" />
          <datalist id="lista-categorias">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field className="sm:col-span-2 lg:col-span-2">
          <FieldLabel htmlFor="prod-precio">Precio de venta ($)</FieldLabel>
          <Input {...campo('precio')} type="number" min="0.01" step="0.01" required />
        </Field>
        <Field className="sm:col-span-2 lg:col-span-2">
          <FieldLabel htmlFor="prod-costo">Costo ($)</FieldLabel>
          <Input {...campo('costo')} type="number" min="0" step="0.01" />
          {margen != null && <FieldDescription className={margen < 0 ? 'text-destructive' : ''}>Margen: {porcentaje(margen)}</FieldDescription>}
        </Field>
        <Field className="sm:col-span-2 lg:col-span-2">
          <FieldLabel htmlFor="prod-stockMinimo">Stock mínimo</FieldLabel>
          <Input {...campo('stockMinimo')} type="number" min="0" step="1" />
        </Field>
        {!editando && (
          <Field className="sm:col-span-2 lg:col-span-2">
            <FieldLabel htmlFor="prod-stock">Stock inicial</FieldLabel>
            <Input {...campo('stock')} type="number" min="0" step="1" placeholder="0" />
          </Field>
        )}
        <Field className={editando ? 'sm:col-span-6 lg:col-span-6' : 'sm:col-span-4 lg:col-span-4'}>
          <FieldLabel htmlFor="prod-descripcion">Descripción</FieldLabel>
          <Textarea {...campo('descripcion')} rows={1} maxLength={500} placeholder="Características principales" className="min-h-9" />
        </Field>
        <Field orientation="horizontal" className="rounded-lg border bg-background p-3 sm:col-span-6 lg:col-span-12">
          <div className="flex-1">
            <FieldLabel htmlFor="prod-activo">Disponible para la venta</FieldLabel>
            <FieldDescription>Los productos inactivos no aparecen al registrar pedidos.</FieldDescription>
          </div>
          <Switch id="prod-activo" checked={form.activo} onCheckedChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
        </Field>
      </FieldGroup>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Spinner />} {editando ? 'Guardar cambios' : 'Crear producto'}
        </Button>
      </div>
    </form>
  );
}

const TIPOS_AJUSTE = {
  entrada: { titulo: 'Entrada', icono: ArrowDownToLine, motivo: 'Compra a proveedor' },
  salida: { titulo: 'Salida', icono: ArrowUpFromLine, motivo: 'Producto dañado' },
  conteo: { titulo: 'Conteo físico', icono: ClipboardCheck, motivo: 'Ajuste por conteo físico' },
};

function AjusteStock({ producto, onAjustado }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const n = parseInt(cantidad, 10);
  const delta = tipo === 'entrada' ? n : tipo === 'salida' ? -n : n - producto.stock;
  const valido = Number.isInteger(n) && n >= 0 && delta !== 0 && producto.stock + delta >= 0;

  const aplicar = async (e) => {
    e.preventDefault();
    if (!valido) return;
    setGuardando(true);
    try {
      const p = await api(`/productos/${producto._id}/stock`, {
        method: 'PATCH',
        body: { cantidad: delta, motivo: motivo || TIPOS_AJUSTE[tipo].motivo, ...(tipo === 'conteo' && { tipo: 'ajuste' }) },
      });
      toast.success('Stock actualizado', { description: `${p.nombre}: ${producto.stock} → ${p.stock} unidades` });
      setCantidad('');
      setMotivo('');
      onAjustado(p);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form onSubmit={aplicar} className="grid gap-3 rounded-lg border p-3">
      <ToggleGroup type="single" variant="outline" size="sm" value={tipo} onValueChange={(v) => v && setTipo(v)} className="w-full">
        {Object.entries(TIPOS_AJUSTE).map(([k, t]) => (
          <ToggleGroupItem key={k} value={k} className="flex-1 gap-1.5">
            <t.icono /> {t.titulo}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className="grid grid-cols-[110px_1fr] gap-2">
        <Input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder={tipo === 'conteo' ? 'Stock real' : 'Cantidad'} aria-label="Cantidad" />
        <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={TIPOS_AJUSTE[tipo].motivo} maxLength={120} aria-label="Motivo" />
      </div>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="tabular">
          {Number.isInteger(n) && delta !== 0 ? (
            producto.stock + delta < 0 ? (
              <span className="text-destructive">No hay suficientes unidades</span>
            ) : (
              <>
                Stock: {producto.stock} → <b className="text-foreground">{producto.stock + delta}</b> ({delta > 0 ? '+' : ''}
                {delta})
              </>
            )
          ) : (
            `Stock actual: ${producto.stock}`
          )}
        </span>
        <Button type="submit" size="sm" disabled={!valido || guardando}>
          {guardando && <Spinner />} Aplicar
        </Button>
      </div>
    </form>
  );
}

// Detalle que se abre DENTRO de la tabla, debajo de la fila del producto
function DetalleProducto({ producto, onCerrar, onActualizado, onEditar }) {
  const { datos: movimientos, recargar } = useApi(`/productos/${producto._id}/movimientos?limit=30`);
  const pct = Math.min(100, (producto.stock / Math.max(producto.stockMinimo * 3, 1)) * 100);
  return (
    <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <EncabezadoExpansion
          titulo={
            <span className="flex flex-wrap items-center gap-2">
              {producto.nombre}
              <Badge variant="outline">{producto.sku}</Badge>
              {producto.activo ? <StockBadge estado={producto.estadoStock} /> : <Badge variant="secondary">Inactivo</Badge>}
            </span>
          }
          descripcion={`${producto.marca || 'Sin marca'} · ${producto.categoria}`}
          onCerrar={onCerrar}
        >
          <Button variant="outline" size="sm" onClick={() => onEditar(producto)}>
            <Pencil /> Editar
          </Button>
        </EncabezadoExpansion>
      </div>
        <div className="grid content-start gap-5">
          {producto.descripcion && <p className="text-sm text-muted-foreground">{producto.descripcion}</p>}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Precio', dinero(producto.precio)],
              ['Costo', dinero(producto.costo)],
              ['Margen', porcentaje(producto.margen)],
            ].map(([t, v]) => (
              <div key={t} className="rounded-lg border bg-background p-3">
                <p className="text-xs text-muted-foreground">{t}</p>
                <p className="font-semibold tabular">{v}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Existencia</p>
                <p className="text-2xl font-semibold tabular">
                  {producto.stock} <span className="text-sm font-normal text-muted-foreground">unidades</span>
                </p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                Mínimo: {producto.stockMinimo}
                <br />
                Valor: {dinero(producto.stock * producto.precio)}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-all', producto.estadoStock === 'agotado' ? 'bg-red-500' : producto.estadoStock === 'bajo' ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Ajustar stock</h3>
            <AjusteStock
              key={producto._id}
              producto={producto}
              onAjustado={(p) => {
                onActualizado(p);
                recargar({ silencioso: true });
              }}
            />
          </div>

        </div>
          <div className="grid content-start gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Historial de movimientos</h3>
              <span className="text-xs text-muted-foreground">Últimos 30</span>
            </div>
            {!movimientos ? (
              <Skeleton className="h-32" />
            ) : movimientos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
            ) : (
              <ul className="grid max-h-[22rem] gap-1 overflow-y-auto rounded-lg border bg-background p-1">
                {movimientos.map((m) => (
                  <li key={m._id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular',
                        m.cantidad > 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'
                      )}
                    >
                      {m.cantidad > 0 ? '+' : ''}
                      {m.cantidad}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate">
                        {m.motivo}
                        {m.referencia && <span className="text-muted-foreground"> · {m.referencia}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {fechaHora(m.fecha)} · {m.usuario}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground tabular">
                      {m.stockAnterior}→{m.stockNuevo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
    </div>
  );
}

export function Productos() {
  const { esAdmin } = useAuth();
  const confirmar = useConfirmar();
  const [params, setParams] = useSearchParams();
  const { datos: productos, cargando, recargar } = useApi('/productos');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [estado, setEstado] = useState('todos');
  const [creando, setCreando] = useState(false);

  // ?id=... abre el detalle del producto dentro de la tabla; &editar=1 abre su formulario ahi mismo
  const lista = productos ?? [];
  const seleccionado = lista.find((p) => p._id === params.get('id')) ?? null;
  const editando = !!seleccionado && params.get('editar') === '1';
  const abrir = (p, editar = false) => setParams(editar ? { id: p._id, editar: '1' } : { id: p._id }, { replace: true });
  const cerrar = () => setParams({}, { replace: true });
  const categorias = useMemo(() => [...new Set(lista.map((p) => p.categoria))].sort((a, b) => a.localeCompare(b, 'es')), [lista]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter(
      (p) =>
        (categoria === 'todas' || p.categoria === categoria) &&
        (estado === 'todos' || (estado === 'inactivos' ? !p.activo : p.estadoStock === estado)) &&
        (!q || `${p.nombre} ${p.sku} ${p.marca}`.toLowerCase().includes(q))
    );
  }, [lista, busqueda, categoria, estado]);

  const resumen = useMemo(
    () => ({
      valor: lista.reduce((t, p) => t + p.precio * p.stock, 0),
      unidades: lista.reduce((t, p) => t + p.stock, 0),
      bajos: lista.filter((p) => p.estadoStock === 'bajo').length,
      agotados: lista.filter((p) => p.estadoStock === 'agotado').length,
    }),
    [lista]
  );

  const actualizar = () => {
    recargar({ silencioso: true });
    notificarCambio();
  };

  const alternarActivo = async (p) => {
    try {
      await api(`/productos/${p._id}`, { method: 'PUT', body: { activo: !p.activo } });
      toast.success(p.activo ? 'Producto desactivado' : 'Producto activado', { description: p.nombre });
      actualizar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const eliminar = async (p) => {
    const ok = await confirmar({
      titulo: `¿Eliminar "${p.nombre}"?`,
      descripcion: 'Se borrará del catálogo junto con su historial de movimientos. Los pedidos anteriores conservan sus datos.',
      accion: 'Eliminar',
      destructivo: true,
    });
    if (!ok) return;
    try {
      await api(`/productos/${p._id}`, { method: 'DELETE' });
      toast.success('Producto eliminado');
      if (seleccionado?._id === p._id) cerrar();
      actualizar();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const columnas = [
    {
      id: 'nombre',
      titulo: 'Producto',
      valor: (p) => p.nombre,
      celda: (p) => (
        <div className={cn('flex items-center gap-3', !p.activo && 'opacity-60')}>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">{p.categoria.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="max-w-64 truncate font-medium">{p.nombre}</p>
            <p className="text-xs text-muted-foreground">
              {p.sku} · {p.marca || 'Sin marca'}
            </p>
          </div>
        </div>
      ),
    },
    { id: 'categoria', titulo: 'Categoría', className: 'hidden lg:table-cell', valor: (p) => p.categoria, celda: (p) => p.categoria },
    { id: 'precio', titulo: 'Precio', alinear: 'right', valor: (p) => p.precio, celda: (p) => <span className="font-medium">{dinero(p.precio)}</span> },
    { id: 'margen', titulo: 'Margen', alinear: 'right', className: 'hidden md:table-cell', valor: (p) => p.margen, celda: (p) => <span className="text-muted-foreground">{porcentaje(p.margen)}</span> },
    { id: 'stock', titulo: 'Stock', alinear: 'right', valor: (p) => p.stock, celda: (p) => <span className="font-medium">{num(p.stock)}</span> },
    { id: 'estado', titulo: 'Estado', className: 'hidden sm:table-cell', valor: (p) => p.stock, celda: (p) => (p.activo ? <StockBadge estado={p.estadoStock} /> : <Badge variant="secondary">Inactivo</Badge>) },
    {
      id: 'acciones',
      titulo: <span className="sr-only">Acciones</span>,
      className: 'w-10',
      celda: (p) => (
        <div onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Acciones">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => abrir(p)}>
                <Boxes /> Ver stock e historial
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => abrir(p, true)}>
                <Pencil /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => alternarActivo(p)}>
                <Power /> {p.activo ? 'Desactivar' : 'Activar'}
              </DropdownMenuItem>
              {esAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => eliminar(p)}>
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
      <EncabezadoPagina titulo="Productos" descripcion="Catálogo, precios y existencias de la tienda.">
        <Button onClick={() => setCreando((v) => !v)} variant={creando ? 'outline' : 'default'}>
          {creando ? <X /> : <Plus />} {creando ? 'Cerrar formulario' : 'Nuevo producto'}
        </Button>
      </EncabezadoPagina>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Productos" icono={Package} cargando={cargando && !productos} valor={num(lista.length)} detalle={`${categorias.length} categorías`} />
        <StatCard titulo="Valor del inventario" icono={CircleDollarSign} cargando={cargando && !productos} valor={dinero(resumen.valor)} detalle={`${num(resumen.unidades)} unidades en existencia`} />
        <StatCard titulo="Stock bajo" icono={TriangleAlert} cargando={cargando && !productos} valor={num(resumen.bajos)} detalle="En o bajo su mínimo" />
        <StatCard titulo="Agotados" icono={PackageX} cargando={cargando && !productos} valor={num(resumen.agotados)} detalle="Sin unidades disponibles" />
      </div>

      {creando && (
        <PanelEnLinea icono={Package} titulo="Nuevo producto" descripcion="Agrega un artículo al catálogo de la tienda." onCerrar={() => setCreando(false)}>
          <ProductoForm
            categorias={categorias}
            onCancelar={() => setCreando(false)}
            onGuardado={(p) => {
              setCreando(false);
              actualizar();
              abrir(p);
            }}
          />
        </PanelEnLinea>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <InputGroup className="md:max-w-xs">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput placeholder="Buscar por nombre, SKU o marca" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </InputGroup>
            <div className="flex gap-2 md:ml-auto">
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="w-full md:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las categorías</SelectItem>
                  {categorias.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={estado} onValueChange={setEstado}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="disponible">Disponibles</SelectItem>
                  <SelectItem value="bajo">Stock bajo</SelectItem>
                  <SelectItem value="agotado">Agotados</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <TablaDatos
            columnas={columnas}
            filas={filtrados}
            cargando={cargando}
            claveFila={(p) => p._id}
            onFila={(p) => (seleccionado?._id === p._id ? cerrar() : abrir(p))}
            tema="productos"
            expandida={seleccionado?._id}
            expansion={(p) =>
              editando ? (
                <>
                  <EncabezadoExpansion titulo={`Editar ${p.nombre}`} descripcion='El stock se modifica desde "Ajustar stock".' onCerrar={cerrar} />
                  <ProductoForm
                    key={p._id}
                    producto={p}
                    categorias={categorias}
                    onCancelar={() => abrir(p)}
                    onGuardado={() => {
                      actualizar();
                      abrir(p);
                    }}
                  />
                </>
              ) : (
                <DetalleProducto producto={p} onCerrar={cerrar} onActualizado={actualizar} onEditar={(x) => abrir(x, true)} />
              )
            }
            vacio={<Vacio icono={Package} titulo="No hay productos" descripcion="Prueba con otros filtros o crea un producto nuevo." />}
          />
        </CardContent>
      </Card>

    </>
  );
}
