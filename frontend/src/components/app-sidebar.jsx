import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Boxes,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Plus,
  ReceiptText,
  ShieldCheck,
  Sun,
  UserRound,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogoMarca } from '@/components/logo';
import { useAuth } from '@/lib/auth';
import { useTema } from '@/lib/theme';
import { iniciales, ROLES } from '@/lib/format';

const SECCIONES = [
  {
    titulo: 'General',
    items: [{ url: '/', titulo: 'Panel', icono: LayoutDashboard, exacto: true }],
  },
  {
    titulo: 'Ventas',
    items: [
      { url: '/pedidos', titulo: 'Pedidos', icono: ReceiptText, contador: 'porDespachar' },
      { url: '/clientes', titulo: 'Clientes', icono: Users },
    ],
  },
  {
    titulo: 'Inventario',
    items: [
      { url: '/productos', titulo: 'Productos', icono: Package, contador: 'reponer' },
      { url: '/inventario', titulo: 'Movimientos', icono: Boxes },
    ],
  },
  {
    titulo: 'Análisis',
    items: [{ url: '/reportes', titulo: 'Reportes', icono: BarChart3 }],
  },
];

function MenuUsuario() {
  const { usuario, cerrarSesion } = useAuth();
  const { oscuro, setTema } = useTema();
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg bg-primary/15 font-medium text-primary">{iniciales(usuario?.nombre)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{usuario?.nombre}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLES[usuario?.rol]}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="font-normal">
              <div className="grid text-sm leading-tight">
                <span className="font-medium">{usuario?.nombre}</span>
                <span className="text-xs text-muted-foreground">{usuario?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link to="/perfil">
                  <UserRound /> Mi cuenta
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setTema(oscuro ? 'light' : 'dark')}>
                {oscuro ? <Sun /> : <Moon />} {oscuro ? 'Tema claro' : 'Tema oscuro'}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={cerrarSesion}>
              <LogOut /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({ contadores = {} }) {
  const { pathname } = useLocation();
  const { esAdmin } = useAuth();
  const { setOpenMobile } = useSidebar();
  const activo = (item) => (item.exacto ? pathname === item.url : pathname === item.url || pathname.startsWith(item.url + '/'));

  const secciones = esAdmin
    ? [...SECCIONES, { titulo: 'Administración', items: [{ url: '/equipo', titulo: 'Equipo', icono: ShieldCheck }] }]
    : SECCIONES;

  return (
    <Sidebar collapsible="icon" variant="inset" className="print:hidden">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/" onClick={() => setOpenMobile(false)}>
                <LogoMarca />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">MercaUJAP</span>
                  <span className="truncate text-xs text-muted-foreground">Tecnología · Valencia</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip="Nuevo pedido"
                className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
              >
                <Link to="/pedidos/nuevo" onClick={() => setOpenMobile(false)}>
                  <Plus /> <span>Nuevo pedido</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        {secciones.map((s) => (
          <SidebarGroup key={s.titulo}>
            <SidebarGroupLabel>{s.titulo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {s.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={activo(item)} tooltip={item.titulo}>
                      <Link to={item.url} onClick={() => setOpenMobile(false)}>
                        <item.icono />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.contador && contadores[item.contador] > 0 && (
                      <SidebarMenuBadge className="rounded-full bg-primary/12 text-primary">{contadores[item.contador]}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <MenuUsuario />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
