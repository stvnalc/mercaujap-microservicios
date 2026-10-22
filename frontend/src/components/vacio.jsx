import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export function Vacio({ icono: Icono, titulo, descripcion, children, className }) {
  return (
    <Empty className={className ?? 'py-12'}>
      <EmptyHeader>
        {Icono && (
          <EmptyMedia variant="icon">
            <Icono />
          </EmptyMedia>
        )}
        <EmptyTitle>{titulo}</EmptyTitle>
        {descripcion && <EmptyDescription>{descripcion}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
