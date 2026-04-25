import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-superadmin',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '') req.url = '/superadmin.html';
          next();
        });
      },
    },
  ],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  root: '.',
  build: {
    outDir: 'dist-superadmin',
    rollupOptions: { input: path.resolve(__dirname, 'superadmin.html') },
  },
  server: {
    port: 3002,
    proxy: {
      '/api': 'http://localhost:3000',
      '/socket.io': { target: 'http://localhost:3000', ws: true },
    },
  },
});
