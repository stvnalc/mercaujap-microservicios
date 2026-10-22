import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';

const VACIO = { nombre: '', email: '', documento: '', telefono: '', direccion: '', activo: true };

// Formulario de crear / editar cliente. Llama a onGuardado(cliente) al terminar.
export function ClienteDialog({ abierto, onCambio, cliente, onGuardado }) {
  const [form, setForm] = useState(VACIO);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const editando = !!cliente?.id;

  useEffect(() => {
    if (abierto) {
      setForm(cliente ? { ...VACIO, ...Object.fromEntries(Object.entries(cliente).map(([k, v]) => [k, v ?? ''])) } : VACIO);
      setError(null);
    }
  }, [abierto, cliente]);

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
      onCambio(false);
      onGuardado?.(guardado);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={onCambio}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={guardar} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
            <DialogDescription>{editando ? 'Actualiza los datos del cliente.' : 'Registra un cliente para poder asignarle pedidos.'}</DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
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
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="cli-email">Correo electrónico</FieldLabel>
              <Input {...campo('email')} type="email" required placeholder="cliente@correo.com" />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="cli-direccion">Dirección de envío</FieldLabel>
              <Input {...campo('direccion')} placeholder="Urbanización, calle, ciudad" />
            </Field>
            {editando && (
              <Field orientation="horizontal" className="sm:col-span-2 rounded-lg border p-3">
                <div className="flex-1">
                  <FieldLabel htmlFor="cli-activo">Cliente activo</FieldLabel>
                  <FieldDescription>Los clientes inactivos no pueden recibir pedidos nuevos.</FieldDescription>
                </div>
                <Switch id="cli-activo" checked={form.activo} onCheckedChange={(v) => setForm((f) => ({ ...f, activo: v }))} />
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onCambio(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando && <Spinner />} {editando ? 'Guardar cambios' : 'Registrar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
