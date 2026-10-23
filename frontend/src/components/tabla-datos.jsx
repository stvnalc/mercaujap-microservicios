import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTiempoReal } from '@/lib/tiempo-real';
import { cn } from '@/lib/utils';

/**
 * Tabla generica con ordenamiento y paginacion.
 * columnas: [{ id, titulo, celda: (fila) => nodo, valor?: (fila) => valor para ordenar, className, alinear: 'right' }]
 * expandida + expansion: la fila con esa clave se abre y muestra debajo, en la misma tabla,
 *   lo que devuelva expansion(fila) (detalle o formulario de edicion), sin tapar el resto de la pagina.
 * tema: tema de tiempo real ("productos", "ordenes"...). Las filas que otra persona acaba de
 *   cambiar se resaltan unos segundos.
 */
export function TablaDatos({ columnas, filas, cargando, vacio, onFila, porPagina = 10, claveFila = (f) => f.id ?? f._id, expandida = null, expansion, tema }) {
  const { recientes } = useTiempoReal();
  const refExpansion = useRef(null);
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

  // Al abrir una fila (ej: desde una notificacion /productos?id=...) ir a su pagina y mostrarla
  const indiceExpandida = expandida == null ? -1 : ordenadas.findIndex((f) => String(claveFila(f)) === String(expandida));
  useEffect(() => {
    if (indiceExpandida < 0) return;
    setPagina(Math.floor(indiceExpandida / porPagina));
    const t = setTimeout(() => refExpansion.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandida, indiceExpandida >= 0]);

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
              visibles.map((fila) => {
                const clave = claveFila(fila);
                const abierta = expansion && expandida != null && String(clave) === String(expandida);
                return (
                  <Fragment key={clave}>
                    <TableRow
                      onClick={onFila ? () => onFila(fila) : undefined}
                      data-state={abierta ? 'selected' : undefined}
                      aria-expanded={expansion ? abierta : undefined}
                      className={cn(
                        onFila && 'cursor-pointer',
                        abierta && 'border-b-0 bg-primary/5 hover:bg-primary/5 data-[state=selected]:bg-primary/5',
                        tema && recientes.has(`${tema}:${clave}`) && 'animate-resaltar'
                      )}
                    >
                      {columnas.map((col) => (
                        <TableCell key={col.id} className={cn(col.alinear === 'right' && 'text-right tabular', col.className)}>
                          {col.celda(fila)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {abierta && (
                      <TableRow className="bg-primary/5 hover:bg-primary/5">
                        <TableCell colSpan={columnas.length} className="p-0 whitespace-normal">
                          <div ref={refExpansion} className="scroll-mt-20 border-l-2 border-primary px-3 pb-4 pt-1 animate-in fade-in-0 slide-in-from-top-1 sm:px-4">
                            {expansion(fila)}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
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
