import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy reenvía /api al backend (Express en :3000) y evita problemas de CORS en desarrollo.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3000' } },
});
