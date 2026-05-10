import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-admin',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '') req.url = '/admin.html';
          next();
        });
      },
    },
  ],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  root: '.',
  build: {
    outDir: 'dist-admin',
    rollupOptions: { input: path.resolve(__dirname, 'admin.html') },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://127.0.0.1:3000',
      '/uploads': 'http://127.0.0.1:3000',
      '/socket.io': { target: 'http://127.0.0.1:3000', ws: true },
    },
  },
});
