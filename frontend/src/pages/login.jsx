import { useState } from 'react';
import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Truck, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { LogoMarca } from '@/components/logo';
import { useAuth } from '@/lib/auth';

const CUENTAS_DEMO = [
  { rol: 'Administrador', email: 'admin@mercaujap.com', password: 'admin123' },
  { rol: 'Vendedor', email: 'vendedor@mercaujap.com', password: 'vendedor123' },
];

export function Login() {
  const { iniciarSesion, motivoSalida } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ver, setVer] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center gap-2 font-semibold">
          <LogoMarca />
          MercaUJAP
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <form onSubmit={enviar}>
              <FieldGroup>
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h1>
                  <p className="text-sm text-muted-foreground">Ingresa con tu cuenta del personal para acceder al panel.</p>
                </div>
                {(error || motivoSalida) && (
                  <Alert variant="destructive">
                    <AlertDescription>{error || motivoSalida}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Mail />
                    </InputGroupAddon>
                    <InputGroupInput id="email" type="email" autoComplete="username" placeholder="tu@mercaujap.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </InputGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                  <InputGroup>
                    <InputGroupAddon>
                      <Lock />
                    </InputGroupAddon>
                    <InputGroupInput id="password" type={ver ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <InputGroupAddon align="inline-end">
                      <InputGroupButton size="icon-xs" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                        {ver ? <EyeOff /> : <Eye />}
                      </InputGroupButton>
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <Button type="submit" size="lg" disabled={enviando} className="w-full">
                  {enviando && <Spinner />} Iniciar sesión
                </Button>
              </FieldGroup>
            </form>

            <Card className="mt-8 gap-3 border-dashed bg-muted/40 py-3 shadow-none ring-0" size="sm">
              <CardContent className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <KeyRound className="size-3.5" /> Cuentas de demostración
                </p>
                {CUENTAS_DEMO.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    onClick={() => {
                      setEmail(c.email);
                      setPassword(c.password);
                      setError(null);
                    }}
                    className="flex w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent"
                  >
                    <span>
                      <span className="block font-medium">{c.rol}</span>
                      <span className="text-xs text-muted-foreground">{c.email}</span>
                    </span>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{c.password}</code>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">© {new Date().getFullYear()} MercaUJAP · Valencia, Carabobo</p>
      </div>

      <div className="relative hidden overflow-hidden bg-[oklch(0.45_0.2_275)] lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0/0.18),transparent_45%),radial-gradient(circle_at_80%_70%,oklch(0.75_0.15_200/0.35),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="max-w-md">
            <p className="text-sm font-medium tracking-wide uppercase opacity-80">Panel de gestión</p>
            <h2 className="mt-3 text-4xl leading-tight font-semibold tracking-tight">Ventas, inventario y clientes en un solo lugar.</h2>
            <p className="mt-4 text-base opacity-80">Registra pedidos en segundos, controla el stock en tiempo real y toma decisiones con reportes claros.</p>
          </div>
          <div className="grid gap-3">
            {[
              { icono: Truck, titulo: 'Seguimiento de pedidos', texto: 'Del pago a la entrega, con historial de cada cambio.' },
              { icono: BarChart3, titulo: 'Reportes al instante', texto: 'Ventas, márgenes y productos más vendidos.' },
              { icono: ShieldCheck, titulo: 'Acceso por roles', texto: 'Administradores y vendedores con permisos distintos.' },
            ].map((f) => (
              <div key={f.titulo} className="flex items-start gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm ring-1 ring-white/15">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <f.icono className="size-4.5" />
                </span>
                <span>
                  <span className="block font-medium">{f.titulo}</span>
                  <span className="text-sm opacity-80">{f.texto}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
