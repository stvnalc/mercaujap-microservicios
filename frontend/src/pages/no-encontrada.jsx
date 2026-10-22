import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Vacio } from '@/components/vacio';

export function NoEncontrada() {
  return (
    <Vacio icono={Compass} titulo="Página no encontrada" descripcion="La dirección que buscas no existe o fue movida." className="py-24">
      <Button asChild>
        <Link to="/">Ir al panel</Link>
      </Button>
    </Vacio>
  );
}
