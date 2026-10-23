import { useState } from 'react';
import { toast } from 'sonner';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCambioExterno } from '@/components/panel-en-linea';
import { api } from '@/lib/api';

const VACIO = { nombre: '', email: '', documento: '', telefono: '', direccion: '', activo: true };
const CAMPOS = Object.keys(VACIO);
const aFormulario = (c) => (c ? { ...VACIO, ...Object.fromEntries(CAMPOS.map((k) => [k, c[k] ?? ''])) } : VACIO);

// Formulario de crear / editar cliente, integrado en la pagina. Llama a onGuardado(cliente) al terminar.
// compacto: una sola columna (para espacios angostos como el registro de pedidos)
export function ClienteForm({ cliente, onCancelar, onGuardado, compacto = false }) {
  const [form, setForm] = useState(() => aFormulario(cliente));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const editando = !!cliente?.id;
  const [cambioExterno, aceptarCambio] = useCambioExterno(cliente, CAMPOS);

  const campo = (nombre) => ({
    id: 'cli-' + nombre,
    value: form[nombre],
    onChange: (e) => setForm((f) => ({ ...f, [nombre]: e.target.value })),
  });

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo = {
      nombre: form.nombre,
      email: form.email,
      documento: form.documento || null,
      telefono: form.telefono || null,
      direccion: form.direccion || null,
      activo: form.activo,
    };
    try {
      const guardado = editando
        ? await api(`/usuarios/${cliente.id}`, { method: 'PUT', body: cuerpo })
        : await api('/usuarios', { method: 'POST', body: { ...cuerpo, rol: 'cliente' } });
      toast.success(editando ? 'Cliente actualizado' : 'Cliente registrado', { description: guardado.nombre });
      onGuardado?.(guardado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const ancho = compacto ? '' : 'sm:col-span-2';
  return (
    <form onSubmit={guardar} className="grid gap-5">
      {cambioExterno && (
        <Alert>
          <TriangleAlert />
          <AlertTitle>Otra persona modificó este cliente</AlertTitle>
          <AlertDescription>Si guardas, tus datos reemplazarán los suyos.</AlertDescription>
          <AlertAction>
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={() => {
                setForm(aFormulario(cliente));
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
      <FieldGroup className={compacto ? 'grid gap-4' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-4'}>
        <Field className={ancho}>
          <FieldLabel htmlFor="cli-nombre">Nombre o razón social</FieldLabel>
          <Input {...campo('nombre')} required minLength={2} placeholder="Ej: María González" />
        </Field>
        <Field>
          <FieldLabel htmlFor="cli-documento">Cédula / RIF</FieldLabel>
          <Input {...campo('documento')} placeholder="V-12345678" />
        </Field>
        <Field>
          <FieldLabel htmlFor="cli-telefono">Teléfono</FieldLabel>
          <Input {...campo('telefono')} placeholder="0414-1234567" />
        </Field>
        <Field className={ancho}>
          <FieldLabel htmlFor="cli-email">Correo electrónico</FieldLabel>
          <Input {...campo('email')} type="email" required placeholder="cliente@correo.com" />
        </Field>
        <Field className={ancho}>
          <FieldLabel htmlFor="cli-direccion">Dirección de envío</FieldLabel>
          <Input {...campo('direccion')} placeholder="Urbanización, calle, ciudad" />
        </Field>
        {editando && (
          <Field orientation="horizontal" className={`rounded-lg border bg-background p-3 ${compacto ? '' : 'sm:col-span-2 lg:col-span-4'}`}>
            <div className="flex-1">
              <FieldLabel htmlFor="cli-activo">Cliente activo</FieldLabel>
              <FieldDescription>Los clientes inactivos no pueden recibir pedidos nuevos.</FieldDescription>
            </div>
            <Switch id="cli-activo" checked={form.activo} onCheckedChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
          </Field>
        )}
      </FieldGroup>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Spinner />} {editando ? 'Guardar cambios' : 'Registrar cliente'}
        </Button>
      </div>
    </form>
  );
}
