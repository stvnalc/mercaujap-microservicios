import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

/**
 * Tabla generica con ordenamiento y paginacion.
 * columnas: [{ id, titulo, celda: (fila) => nodo, valor?: (fila) => valor para ordenar, className, alinear: 'right' }]
 */
export function TablaDatos({ columnas, filas, cargando, vacio, onFila, porPagina = 10, claveFila = (f) => f.id ?? f._id }) {
  const [orden, setOrden] = useState(null); // { id, dir: 1 | -1 }
  const [pagina, setPagina] = useState(0);

  const ordenadas = useMemo(() => {
    if (!orden || !filas) return filas ?? [];
    const col = columnas.find((c) => c.id === orden.id);
    if (!col?.valor) return filas;
    return [...filas].sort((a, b) => {
      const va = col.valor(a);
      const vb = col.valor(b);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb) * orden.dir;
    });
  }, [filas, orden, columnas]);

  const total = ordenadas.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  useEffect(() => {
    if (pagina > paginas - 1) setPagina(0);
  }, [paginas, pagina]);
  const visibles = ordenadas.slice(pagina * porPagina, pagina * porPagina + porPagina);

  const alternarOrden = (col) => {
    if (!col.valor) return;
    setOrden((o) => (o?.id !== col.id ? { id: col.id, dir: 1 } : o.dir === 1 ? { id: col.id, dir: -1 } : null));
  };

  return (
    <div className="flex flex-col">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              {columnas.map((col) => (
                <TableHead key={col.id} className={cn(col.alinear === 'right' && 'text-right', col.className)}>
                  {col.valor ? (
                    <button
                      type="button"
                      onClick={() => alternarOrden(col)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded hover:text-foreground',
                        col.alinear === 'right' && 'flex-row-reverse'
                      )}
                    >
                      {col.titulo}
                      {orden?.id === col.id ? (
                        orden.dir === 1 ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.titulo
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cargando && !filas?.length ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {columnas.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : visibles.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnas.length} className="p-0">
                  {vacio}
                </TableCell>
              </TableRow>
            ) : (
              visibles.map((fila) => (
                <TableRow
                  key={claveFila(fila)}
                  onClick={onFila ? () => onFila(fila) : undefined}
                  className={cn(onFila && 'cursor-pointer')}
                >
                  {columnas.map((col) => (
                    <TableCell key={col.id} className={cn(col.alinear === 'right' && 'text-right tabular', col.className)}>
                      {col.celda(fila)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {total > porPagina && (
        <div className="flex items-center justify-between gap-2 pt-3 text-sm text-muted-foreground">
          <span className="tabular">
            {pagina * porPagina + 1}–{Math.min(total, (pagina + 1) * porPagina)} de {total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} aria-label="Página anterior">
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular">
              {pagina + 1} / {paginas}
            </span>
            <Button variant="outline" size="icon-sm" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)} aria-label="Página siguiente">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
