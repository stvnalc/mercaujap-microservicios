import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { ProveedorConfirmar } from '@/components/confirmar';
import { ErrorBoundary } from '@/components/error-boundary';
import { ProveedorAuth } from '@/lib/auth';
import { ProveedorTema } from '@/lib/theme';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ProveedorTema>
      <ProveedorAuth>
        <TooltipProvider delayDuration={200}>
          <ProveedorConfirmar>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
            <Toaster position="top-right" richColors closeButton />
          </ProveedorConfirmar>
        </TooltipProvider>
      </ProveedorAuth>
    </ProveedorTema>
  </StrictMode>
);
