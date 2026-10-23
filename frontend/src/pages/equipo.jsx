import { useState } from 'react';
import { toast } from 'sonner';
import { MoreHorizontal, Pencil, Power, ShieldCheck, Trash2, TriangleAlert, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { EncabezadoPagina } from '@/components/page-header';
import { TablaDatos } from '@/components/tabla-datos';
import { ActivoBadge, RolBadge } from '@/components/badges';
import { Vacio } from '@/components/vacio';
import { EncabezadoExpansion, PanelEnLinea, useCambioExterno } from '@/components/panel-en-linea';
import { useConfirmar } from '@/components/confirmar';
import { useApi } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { hace, iniciales } from '@/lib/format';

const PERMISOS = {
  admin: 'Acceso total: puede eliminar registros y administrar al equipo.',
  vendedor: 'Registra pedidos, clientes y productos. No puede eliminar registros.',
};

// Formulario de cuenta del personal, integrado en la pagina
function MiembroForm({ miembro, onCancelar, onGuardado }) {
  const editando = !!miembro?.id;
  const [form, setForm] = useState(() =>
    miembro ? { nombre: miembro.nombre, email: miembro.email, telefono: miembro.telefono ?? '', rol: miembro.rol, password: '' } : { nombre: '', email: '', telefono: '', rol: 'vendedor', password: '' }
  );
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cambioExterno] = useCambioExterno(miembro, ['nombre', 'email', 'rol', 'activo']);

  const campo = (n) => ({ id: 'eq-' + n, value: form[n], onChange: (e) => setForm((f) => ({ ...f, [n]: e.target.value })) });

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError(null);
    const cuerpo = { nombre: form.nombre, email: form.email, telefono: form.telefono || null, rol: form.rol, ...(form.password && { password: form.password }) };
    try {
      const m = editando ? await api(`/usuarios/${miembro.id}`, { method: 'PUT', body: cuerpo }) : await api('/usuarios', { method: 'POST', body: cuerpo });
      toast.success(editando ? 'Cuenta actualizada' : 'Cuenta creada', { description: `${m.nombre} · ${m.email}` });
      onGuardado(m);
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
          <AlertTitle>Otro administrador modificó esta cuenta</AlertTitle>
          <AlertDescription>Revisa los datos antes de guardar para no reemplazar sus cambios.</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <FieldGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel htmlFor="eq-nombre">Nombre completo</FieldLabel>
          <Input {...campo('nombre')} required minLength={2} />
        </Field>
        <Field>
          <FieldLabel htmlFor="eq-email">Correo (usuario de acceso)</FieldLabel>
          <Input {...campo('email')} type="email" required />
        </Field>
        <Field>
          <FieldLabel>Rol</FieldLabel>
          <Select value={form.rol} onValueChange={(v) => setForm((f) => ({ ...f, rol: v }))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vendedor">Vendedor</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="eq-password">{editando ? 'Nueva contraseña' : 'Contraseña'}</FieldLabel>
          <Input {...campo('password')} type="password" minLength={6} required={!editando} autoComplete="new-password" placeholder={editando ? 'Vacía = no cambiarla' : 'Mínimo 6 caracteres'} />
        </Field>
        <FieldDescription className="sm:col-span-2 lg:col-span-4">
          <ShieldCheck className="mr-1 inline size-3.5" />
          {PERMISOS[form.rol]}
        </FieldDescription>
      </FieldGroup>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando && <Spinner />} {editando ? 'Guardar' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  );
}

export function Equipo() {
  const { usuario } = useAuth();
  const confirmar = useConfirmar();
  const { datos: equipo, cargando, recargar } = useApi('/usuarios?tipo=personal');
  const [creando, setCreando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);

  const alternar = async (m) => {
    try {
      await api(`/usuarios/${m.id}`, { method: 'PUT', body: { activo: !m.activo } });
      toast.success(m.activo ? 'Acceso desactivado' : 'Acceso activado', { description: m.nombre });
      recargar({ silencioso: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const eliminar = async (m) => {
    if (!(await confirmar({ titulo: `¿Eliminar la cuenta de ${m.nombre}?`, descripcion: 'La persona ya no podrá iniciar sesión.', accion: 'Eliminar', destructivo: true }))) return;
    try {
      await api(`/usuarios/${m.id}`, { method: 'DELETE' });
      toast.success('Cuenta eliminada');
      recargar({ silencioso: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  const columnas = [
    {
      id: 'nombre',
      titulo: 'Miembro',
      valor: (m) => m.nombre,
      celda: (m) => (
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{iniciales(m.nombre)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">
              {m.nombre} {m.id === usuario.id && <Badge variant="secondary" className="ml-1">Tú</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">{m.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'rol', titulo: 'Rol', valor: (m) => m.rol, celda: (m) => <RolBadge rol={m.rol} /> },
    { id: 'acceso', titulo: 'Último acceso', className: 'hidden md:table-cell', valor: (m) => m.ultimo_acceso, celda: (m) => <span className="text-sm text-muted-foreground">{m.ultimo_acceso ? hace(m.ultimo_acceso) : 'Nunca'}</span> },
    { id: 'estado', titulo: 'Estado', valor: (m) => (m.activo ? 1 : 0), celda: (m) => <ActivoBadge activo={m.activo} /> },
    {
      id: 'acciones',
      titulo: <span className="sr-only">Acciones</span>,
      className: 'w-10',
      celda: (m) => (
        <div onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Acciones">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setEditandoId(m.id)}>
              <Pencil /> Editar
            </DropdownMenuItem>
            {m.id !== usuario.id && (
              <>
                <DropdownMenuItem onSelect={() => alternar(m)}>
                  <Power /> {m.activo ? 'Desactivar acceso' : 'Activar acceso'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => eliminar(m)}>
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
      <EncabezadoPagina titulo="Equipo" descripcion="Cuentas del personal con acceso al panel y sus permisos.">
        <Button onClick={() => setCreando((v) => !v)} variant={creando ? 'outline' : 'default'}>
          {creando ? <X /> : <UserPlus />} {creando ? 'Cerrar formulario' : 'Agregar miembro'}
        </Button>
      </EncabezadoPagina>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(PERMISOS).map(([rol, texto]) => (
          <Card key={rol} size="sm">
            <CardContent className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <p className="font-medium">{rol === 'admin' ? 'Administrador' : 'Vendedor'}</p>
                <p className="text-sm text-muted-foreground">{texto}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {creando && (
        <PanelEnLinea icono={UserPlus} titulo="Nueva cuenta del personal" descripcion="Las cuentas del personal pueden iniciar sesión en el panel." onCerrar={() => setCreando(false)}>
          <MiembroForm
            onCancelar={() => setCreando(false)}
            onGuardado={() => {
              setCreando(false);
              recargar({ silencioso: true });
            }}
          />
        </PanelEnLinea>
      )}
      <Card>
        <CardContent>
          <TablaDatos
            columnas={columnas}
            filas={equipo}
            cargando={cargando}
            tema="usuarios"
            onFila={(m) => setEditandoId((id) => (id === m.id ? null : m.id))}
            expandida={editandoId}
            expansion={(m) => (
              <>
                <EncabezadoExpansion titulo={`Editar la cuenta de ${m.nombre}`} descripcion={m.email} onCerrar={() => setEditandoId(null)} />
                <MiembroForm
                  key={m.id}
                  miembro={m}
                  onCancelar={() => setEditandoId(null)}
                  onGuardado={() => {
                    setEditandoId(null);
                    recargar({ silencioso: true });
                  }}
                />
              </>
            )}
            vacio={<Vacio icono={ShieldCheck} titulo="Sin miembros" />}
          />
        </CardContent>
      </Card>
    </>
  );
}
