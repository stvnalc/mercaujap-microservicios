import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { Layout } from '@/components/layout';
import { useAuth } from '@/lib/auth';
import { Login } from '@/pages/login';
import { Dashboard } from '@/pages/dashboard';
import { ListaPedidos } from '@/pages/pedidos/lista';
import { NuevoPedido } from '@/pages/pedidos/nuevo';
import { DetallePedido } from '@/pages/pedidos/detalle';
import { Productos } from '@/pages/productos';
import { Inventario } from '@/pages/inventario';
import { Clientes } from '@/pages/clientes';
import { DetalleReporte, Reportes } from '@/pages/reportes';
import { Equipo } from '@/pages/equipo';
import { Perfil } from '@/pages/perfil';
import { NoEncontrada } from '@/pages/no-encontrada';

export default function App() {
  const { usuario, cargando, esAdmin } = useAuth();

  if (cargando) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        <Spinner className="size-6" />
      </div>
    );
  }
  if (!usuario) return <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pedidos" element={<ListaPedidos />} />
          <Route path="pedidos/nuevo" element={<NuevoPedido />} />
          <Route path="pedidos/:id" element={<DetallePedido />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="productos" element={<Productos />} />
          <Route path="inventario" element={<Inventario />} />
          <Route path="reportes" element={<Reportes />} />
          <Route path="reportes/:id" element={<DetalleReporte />} />
          <Route path="equipo" element={esAdmin ? <Equipo /> : <Navigate to="/" replace />} />
          <Route path="perfil" element={<Perfil />} />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
