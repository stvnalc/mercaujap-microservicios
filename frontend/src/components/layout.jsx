import { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { AppSidebar } from '@/components/app-sidebar';
import { BusquedaGlobal } from '@/components/busqueda-global';
import { EstadoSistema } from '@/components/estado-sistema';
import { Notificaciones } from '@/components/notificaciones';
import { EnVivo } from '@/components/en-vivo';
import { ErrorBoundary } from '@/components/error-boundary';
import { api } from '@/lib/api';
import { useTema } from '@/lib/theme';
import { useEventos } from '@/lib/tiempo-real';

const TITULOS = {
  '': 'Panel',
  pedidos: 'Pedidos',
  nuevo: 'Nuevo pedido',
  clientes: 'Clientes',
  productos: 'Productos',
  inventario: 'Movimientos',
  reportes: 'Reportes',
  equipo: 'Equipo',
  perfil: 'Mi cuenta',
};

function Migas() {
  const partes = useLocation().pathname.split('/').filter(Boolean);
  if (partes.length === 0) {
    return (
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage>Panel</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    );
  }
  return (
    <BreadcrumbList>
      {partes.map((p, i) => {
        const url = '/' + partes.slice(0, i + 1).join('/');
        const titulo = TITULOS[p] ?? (partes[0] === 'pedidos' ? 'Detalle' : partes[0] === 'reportes' ? 'Reporte' : p);
        const ultimo = i === partes.length - 1;
        return (
          <span key={url} className="contents">
            {i > 0 && <BreadcrumbSeparator className="hidden sm:block" />}
            <BreadcrumbItem className={!ultimo ? 'hidden sm:inline-flex' : undefined}>
              {ultimo ? <BreadcrumbPage>{titulo}</BreadcrumbPage> : <BreadcrumbLink asChild><Link to={url}>{titulo}</Link></BreadcrumbLink>}
            </BreadcrumbItem>
          </span>
        );
      })}
    </BreadcrumbList>
  );
}

export function Layout() {
  const { oscuro, setTema } = useTema();
  const { pathname } = useLocation();
  const [alertas, setAlertas] = useState({});

  // Contadores del menu y notificaciones: se refrescan al instante cuando alguien cambia
  // pedidos o productos (tiempo real) y, por si acaso, cada 2 minutos
  const cargarAlertas = useCallback(async () => {
    try {
      const [pendientes, porEnviar, bajos, agotados] = await Promise.all([
        api('/ordenes?estado=PENDIENTE'),
        api('/ordenes?estado=PAGADA'),
        api('/productos?estado=bajo&activo=true'),
        api('/productos?estado=agotado&activo=true'),
      ]);
      setAlertas({ pendientes, porEnviar, bajos, agotados });
    } catch {
      /* si un servicio no responde, se mantienen los ultimos datos */
    }
  }, []);

  useEffect(() => {
    cargarAlertas();
    const t = setInterval(cargarAlertas, 120000);
    window.addEventListener('datos-cambiaron', cargarAlertas);
    return () => {
      clearInterval(t);
      window.removeEventListener('datos-cambiaron', cargarAlertas);
    };
  }, [cargarAlertas]);

  useEventos(['ordenes', 'productos'], cargarAlertas);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const contadores = {
    porDespachar: (alertas.pendientes?.length ?? 0) + (alertas.porEnviar?.length ?? 0),
    reponer: (alertas.bajos?.length ?? 0) + (alertas.agotados?.length ?? 0),
  };

  return (
    <SidebarProvider>
      <AppSidebar contadores={contadores} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur supports-backdrop-filter:bg-background/70 sm:px-4 print:hidden md:rounded-t-xl">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0 flex-1">
            <Migas />
          </Breadcrumb>
          <div className="flex items-center gap-1">
            <div className="hidden md:block">
              <BusquedaGlobal />
            </div>
            <EnVivo />
            <EstadoSistema />
            <Notificaciones alertas={alertas} />
            <Button variant="ghost" size="icon" onClick={() => setTema(oscuro ? 'light' : 'dark')} aria-label="Cambiar tema">
              {oscuro ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 sm:p-6 print:p-0">
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Avisa al layout que algo cambio (nuevo pedido, stock, etc.) para refrescar contadores
export const notificarCambio = () => window.dispatchEvent(new Event('datos-cambiaron'));
