import { useState } from 'react';
import { toast } from 'sonner';
import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Spinner } from '@/components/ui/spinner';
import { EncabezadoPagina } from '@/components/page-header';
import { RolBadge } from '@/components/badges';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTema } from '@/lib/theme';
import { fechaHora, iniciales } from '@/lib/format';

export function Perfil() {
  const { usuario } = useAuth();
  const { tema, setTema } = useTema();
  const [form, setForm] = useState({ actual: '', nueva: '', repetir: '' });
  const [guardando, setGuardando] = useState(false);

  const cambiar = async (e) => {
    e.preventDefault();
    if (form.nueva !== form.repetir) return toast.error('Las contraseñas nuevas no coinciden');
    setGuardando(true);
    try {
      await api('/auth/cambiar-password', { method: 'POST', body: { actual: form.actual, nueva: form.nueva } });
      toast.success('Contraseña actualizada');
      setForm({ actual: '', nueva: '', repetir: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const campo = (n) => ({ id: 'pw-' + n, type: 'password', value: form[n], onChange: (e) => setForm((f) => ({ ...f, [n]: e.target.value })) });

  return (
    <>
      <EncabezadoPagina titulo="Mi cuenta" descripcion="Tus datos de acceso y preferencias." />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4">
            <Avatar className="size-14">
              <AvatarFallback className="bg-primary/10 text-lg font-medium text-primary">{iniciales(usuario.nombre)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">{usuario.nombre}</p>
              <p className="truncate text-sm text-muted-foreground">{usuario.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Último acceso: {fechaHora(usuario.ultimo_acceso)}</p>
            </div>
            <RolBadge rol={usuario.rol} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>Elige cómo se ve el panel en este navegador.</CardDescription>
          </CardHeader>
          <CardContent>
            <ToggleGroup type="single" variant="outline" value={tema} onValueChange={(v) => v && setTema(v)}>
              <ToggleGroupItem value="light" className="gap-1.5 px-3">
                <Sun /> Claro
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" className="gap-1.5 px-3">
                <Moon /> Oscuro
              </ToggleGroupItem>
              <ToggleGroupItem value="system" className="gap-1.5 px-3">
                <Monitor /> Sistema
              </ToggleGroupItem>
            </ToggleGroup>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 lg:max-w-xl">
          <form onSubmit={cambiar}>
            <CardHeader>
              <CardTitle>Cambiar contraseña</CardTitle>
              <CardDescription>Usa al menos 6 caracteres.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel htmlFor="pw-actual">Contraseña actual</FieldLabel>
                  <Input {...campo('actual')} required autoComplete="current-password" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="pw-nueva">Nueva contraseña</FieldLabel>
                    <Input {...campo('nueva')} required minLength={6} autoComplete="new-password" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="pw-repetir">Repite la nueva contraseña</FieldLabel>
                    <Input {...campo('repetir')} required minLength={6} autoComplete="new-password" />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
            <CardFooter className="mt-4 justify-end">
              <Button type="submit" disabled={guardando}>
                {guardando && <Spinner />} Actualizar contraseña
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
