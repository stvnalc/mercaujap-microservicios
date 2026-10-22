import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Boxes, LayoutDashboard, Package, Plus, ReceiptText, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { api } from '@/lib/api';
import { dinero } from '@/lib/format';
import { EstadoBadge } from '@/components/badges';

const PAGINAS = [
  { titulo: 'Panel', url: '/', icono: LayoutDashboard },
  { titulo: 'Nuevo pedido', url: '/pedidos/nuevo', icono: Plus },
  { titulo: 'Pedidos', url: '/pedidos', icono: ReceiptText },
  { titulo: 'Clientes', url: '/clientes', icono: Users },
  { titulo: 'Productos', url: '/productos', icono: Package },
  { titulo: 'Movimientos de inventario', url: '/inventario', icono: Boxes },
  { titulo: 'Reportes', url: '/reportes', icono: BarChart3 },
];

// Buscador global (Ctrl + K): paginas, pedidos, clientes y productos
export function BusquedaGlobal() {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const navegar = useNavigate();

  useEffect(() => {
    const tecla = (e) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setAbierto((a) => !a);
      }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, []);

  useEffect(() => {
    if (!abierto) return;
    Promise.all([api('/ordenes'), api('/usuarios?tipo=clientes'), api('/productos')])
      .then(([ordenes, clientes, productos]) => setDatos({ ordenes, clientes, productos }))
      .catch(() => setDatos({ ordenes: [], clientes: [], productos: [] }));
  }, [abierto]);

  const ir = (url) => {
    setAbierto(false);
    navegar(url);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setAbierto(true)}
        className="h-8 w-full max-w-64 justify-start gap-2 bg-background px-2.5 font-normal text-muted-foreground shadow-none sm:w-64"
      >
        <Search className="size-4" />
        <span className="flex-1 truncate text-left">Buscar…</span>
        <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
      </Button>
      <CommandDialog open={abierto} onOpenChange={setAbierto} className="sm:max-w-xl" title="Buscar" description="Busca pedidos, clientes, productos o páginas">
        <Command>
        <CommandInput placeholder="Busca un pedido, cliente, producto o página…" />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Ir a">
            {PAGINAS.map((p) => (
              <CommandItem key={p.url} value={'pagina ' + p.titulo} onSelect={() => ir(p.url)}>
                <p.icono /> {p.titulo}
              </CommandItem>
            ))}
          </CommandGroup>
          {datos && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Pedidos">
                {datos.ordenes.slice(0, 60).map((o) => (
                  <CommandItem key={'o' + o.id} value={`${o.codigo} ${o.usuarioNombre}`} onSelect={() => ir(`/pedidos/${o.id}`)}>
                    <ReceiptText />
                    <span className="font-medium">{o.codigo}</span>
                    <span className="truncate text-muted-foreground">{o.usuarioNombre}</span>
                    <span className="ml-auto flex items-center gap-2">
                      <EstadoBadge estado={o.estado} />
                      <span className="tabular text-xs">{dinero(o.total)}</span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Clientes">
                {datos.clientes.map((c) => (
                  <CommandItem key={'c' + c.id} value={`${c.nombre} ${c.email} ${c.documento ?? ''}`} onSelect={() => ir(`/clientes?id=${c.id}`)}>
                    <Users />
                    {c.nombre}
                    <span className="ml-auto text-xs text-muted-foreground">{c.documento ?? c.email}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup heading="Productos">
                {datos.productos.map((p) => (
                  <CommandItem key={'p' + p._id} value={`${p.nombre} ${p.sku} ${p.marca}`} onSelect={() => ir(`/productos?id=${p._id}`)}>
                    <Package />
                    <span className="truncate">{p.nombre}</span>
                    <span className="ml-auto text-xs text-muted-foreground tabular">
                      {dinero(p.precio)} · {p.stock} u.
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
