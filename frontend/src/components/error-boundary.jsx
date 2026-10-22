import { Component } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Si una pantalla falla, muestra un aviso en lugar de dejar la pagina en blanco
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[MercaUJAP] Error en la interfaz:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-semibold">Algo salió mal en esta pantalla</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">Recarga la página para continuar. Si el problema persiste, contacta al administrador del sistema.</p>
        </div>
        <Button onClick={() => window.location.reload()}>Recargar</Button>
      </div>
    );
  }
}
