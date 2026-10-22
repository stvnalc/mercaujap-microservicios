import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Minus, Package, Plus, Search, ShoppingCart, Trash2, UserPlus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { EncabezadoPagina } from '@/components/page-header';
import { ClienteDialog } from '@/components/cliente-dialog';
import { Vacio } from '@/components/vacio';
import { notificarCambio } from '@/components/layout';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { dinero, METODOS_PAGO } from '@/lib/format';
import { cn } from '@/lib/utils';

const IVA = 0.16;

function SelectorCliente({ clientes, valor, onCambio, onNuevo }) {
  const [abierto, setAbierto] = useState(false);
  const elegido = clientes.find((c) => c.id === valor);
  return (
    <div className="flex gap-2">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={abierto} className="h-10 flex-1 justify-between font-normal">
            {elegido ? (
              <span className="truncate">
                {elegido.nombre} <span className="text-muted-foreground">· {elegido.documento ?? elegido.email}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">Selecciona un cliente…</span>
            )}
            <ChevronsUpDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar por nombre, cédula o correo…" />
            <CommandList>
              <CommandEmpty>No se encontró el cliente.</CommandEmpty>
              <CommandGroup>
                {clientes.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.nombre} ${c.documento ?? ''} ${c.email}`}
                    onSelect={() => {
                      onCambio(c.id);
                      setAbierto(false);
                    }}
                  >
                    <Check className={cn(valor === c.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{c.nombre}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{c.documento ?? c.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Button variant="outline" size="icon-lg" className="size-10" onClick={onNuevo} aria-label="Nuevo cliente">
        <UserPlus />
      </Button>
    </div>
  );
}

export function NuevoPedido() {
  const navegar = useNavigate();
  const { datos: clientesApi, recargar: recargarClientes } = useApi('/usuarios?tipo=clientes&activo=true');
  const { datos: productos, cargando: cargandoProductos } = useApi('/productos?activo=true');
  const [clienteId, setClienteId] = useState(null);
  const [carrito, setCarrito] = useState([]); // [{ producto, cantidad }]
  const [busqueda, setBusqueda] = useState('');
  const [metodo, setMetodo] = useState('PAGO_MOVIL');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const clientes = clientesApi ?? [];
  const cliente = clientes.find((c) => c.id === clienteId);
  const [params] = useSearchParams();

  // /pedidos/nuevo?cliente=5 llega con el cliente ya seleccionado
  useEffect(() => {
    const id = Number(params.get('cliente'));
    const c = clientesApi?.find((x) => x.id === id);
    if (c) {
      setClienteId(c.id);
      setDireccion(c.direccion ?? '');
    }
  }, [clientesApi, params]);

  const elegirCliente = (id, lista = clientes) => {
    setClienteId(id);
    setDireccion(lista.find((c) => c.id === id)?.direccion ?? '');
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (productos ?? []).filter((p) => !q || `${p.nombre} ${p.sku} ${p.marca} ${p.categoria}`.toLowerCase().includes(q));
  }, [productos, busqueda]);

  const enCarrito = (id) => carrito.find((l) => l.producto._id === id)?.cantidad ?? 0;

  const agregar = (producto, delta = 1) => {
    setCarrito((c) => {
      const linea = c.find((l) => l.producto._id === producto._id);
      const nueva = (linea?.cantidad ?? 0) + delta;
      if (nueva > producto.stock) {
        toast.warning(`Solo hay ${producto.stock} unidad(es) de ${producto.nombre}`);
        return c;
      }
      if (nueva <= 0) return c.filter((l) => l.producto._id !== producto._id);
      return linea ? c.map((l) => (l === linea ? { ...l, cantidad: nueva } : l)) : [...c, { producto, cantidad: nueva }];
    });
  };

  const subtotal = carrito.reduce((t, l) => t + l.producto.precio * l.cantidad, 0);
  const impuesto = Math.round(subtotal * IVA * 100) / 100;
  const total = subtotal + impuesto;
  const unidades = carrito.reduce((t, l) => t + l.cantidad, 0);

  const registrar = async () => {
    if (!clienteId) return toast.error('Selecciona el cliente del pedido');
    if (!carrito.length) return toast.error('Agrega al menos un producto');
    setEnviando(true);
    try {
      const orden = await api('/ordenes', {
        method: 'POST',
        body: {
          usuarioId: clienteId,
          metodoPago: metodo,
          direccionEnvio: direccion,
          notas,
          items: carrito.map((l) => ({ productoId: l.producto._id, cantidad: l.cantidad })),
        },
      });
      toast.success(`Pedido ${orden.codigo} registrado`, { description: `${orden.usuarioNombre} · ${dinero(orden.total)}` });
      notificarCambio();
      navegar(`/pedidos/${orden.id}`);
    } catch (e) {
      toast.error('No se pudo registrar el pedido', { description: e.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <EncabezadoPagina titulo="Nuevo pedido" descripcion="Selecciona el cliente, agrega los productos y confirma el pago." />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4 text-muted-foreground" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {!clientesApi ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <SelectorCliente clientes={clientes} valor={clienteId} onCambio={(id) => elegirCliente(id)} onNuevo={() => setNuevoCliente(true)} />
              )}
              {cliente && (
                <div className="grid gap-1 rounded-lg bg-muted/50 p-3 text-sm sm:grid-cols-3">
                  <span>
                    <span className="block text-xs text-muted-foreground">Documento</span>
                    {cliente.documento ?? '—'}
                  </span>
                  <span>
                    <span className="block text-xs text-muted-foreground">Teléfono</span>
                    {cliente.telefono ?? '—'}
                  </span>
                  <span className="truncate">
                    <span className="block text-xs text-muted-foreground">Correo</span>
                    {cliente.email}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="size-4 text-muted-foreground" /> Productos
              </CardTitle>
              <CardDescription>Haz clic en un producto para agregarlo al pedido.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <InputGroup>
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput placeholder="Buscar por nombre, SKU, marca o categoría" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
              </InputGroup>
              {cargandoProductos && !productos ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : visibles.length === 0 ? (
                <Vacio icono={Package} titulo="Sin resultados" descripcion="No hay productos que coincidan con la búsqueda." />
              ) : (
                <div className="grid max-h-[460px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {visibles.map((p) => {
                    const cantidad = enCarrito(p._id);
                    const agotado = p.stock <= 0;
                    return (
                      <button
                        key={p._id}
                        type="button"
                        disabled={agotado}
                        onClick={() => agregar(p)}
                        className={cn(
                          'group relative flex flex-col gap-1 rounded-lg border p-3 text-left transition-all hover:border-primary/50 hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50',
                          cantidad > 0 && 'border-primary/60 bg-primary/5 ring-1 ring-primary/20'
                        )}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-sm font-medium">{p.nombre}</span>
                          {cantidad > 0 ? (
                            <Badge className="shrink-0">{cantidad}</Badge>
                          ) : (
                            <Plus className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {p.sku} · {p.categoria}
                        </span>
                        <span className="mt-1 flex items-center justify-between text-sm">
                          <span className="font-semibold tabular">{dinero(p.precio)}</span>
                          <span className={cn('text-xs tabular', agotado ? 'text-destructive' : p.estadoStock === 'bajo' ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
                            {agotado ? 'Agotado' : `${p.stock} disponibles`}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0 lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4 text-muted-foreground" /> Resumen
            </CardTitle>
            <CardAction>
              {carrito.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCarrito([])}>
                  Vaciar
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4">
            {carrito.length === 0 ? (
              <Vacio icono={ShoppingCart} titulo="Pedido vacío" descripcion="Los productos que agregues aparecerán aquí." className="py-6" />
            ) : (
              <ul className="grid gap-2">
                {carrito.map((l) => (
                  <li key={l.producto._id} className="grid gap-2 rounded-lg border p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{l.producto.nombre}</p>
                        <p className="text-xs text-muted-foreground tabular">{dinero(l.producto.precio)} c/u</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular">{dinero(l.producto.precio * l.cantidad)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-md border">
                        <Button variant="ghost" size="icon-xs" onClick={() => agregar(l.producto, -1)} aria-label="Quitar uno">
                          <Minus />
                        </Button>
                        <span className="w-8 text-center text-sm tabular">{l.cantidad}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => agregar(l.producto, 1)} aria-label="Agregar uno">
                          <Plus />
                        </Button>
                      </div>
                      <Button variant="ghost" size="xs" className="text-muted-foreground" onClick={() => agregar(l.producto, -l.cantidad)}>
                        <Trash2 /> Quitar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <Separator />
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>Método de pago</FieldLabel>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METODOS_PAGO).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="direccion">Dirección de envío</FieldLabel>
                <Textarea id="direccion" rows={2} value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Se usa la dirección del cliente si se deja vacía" maxLength={200} />
              </Field>
              <Field>
                <FieldLabel htmlFor="notas">Notas</FieldLabel>
                <Textarea id="notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: entregar después de las 3 p. m." maxLength={500} />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <dl className="grid gap-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal ({unidades} u.)</dt>
                <dd className="tabular">{dinero(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>IVA (16 %)</dt>
                <dd className="tabular">{dinero(impuesto)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular">{dinero(total)}</dd>
              </div>
            </dl>
            <Button size="lg" onClick={registrar} disabled={enviando || !carrito.length || !clienteId}>
              {enviando && <Spinner />} Registrar pedido
            </Button>
          </CardFooter>
        </Card>
      </div>

      <ClienteDialog
        abierto={nuevoCliente}
        onCambio={setNuevoCliente}
        onGuardado={async (c) => {
          await recargarClientes({ silencioso: true });
          setClienteId(c.id);
          setDireccion(c.direccion ?? '');
        }}
      />
    </>
  );
}
