import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Durante el desarrollo (npm run dev) las peticiones a /api (y el WebSocket) se envian al API Gateway
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: { proxy: { '/api': { target: 'http://localhost:8080', ws: true } } },
  build: { chunkSizeWarningLimit: 1500 },
});
