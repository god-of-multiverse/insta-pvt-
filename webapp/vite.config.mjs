import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev harness for the web client. `expo start --web` still works for the Expo
// workflow; Vite gives a fast, offline-friendly dev server for the browser build.
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Allow the sandbox/preview hostnames, not just localhost.
    allowedHosts: true,
    proxy: {
      // Browser code always calls same-origin `/api` and `/uploads`;
      // the dev server forwards those to the Express backend.
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5000', changeOrigin: true },
    },
  },
});
