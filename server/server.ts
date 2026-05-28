import './config/env';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { connectDb } from './config/db';
import { env } from './config/env';
import { initSocket } from './socket/index';
import apiRouter from './routes/api';
import authRouter from './routes/auth';
import customerRouter from './routes/customer';
import ownerRouter from './routes/owner';
import stripeRouter from './routes/stripe';
import { getPublicPlans } from './controllers/planController';
import { errorHandler } from './middleware/errorHandler';
import { runSeed } from './scripts/seed';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  initSocket(httpServer);

  app.use(cors());

  // Stripe webhook needs raw body — register before express.json()
  app.use('/api/stripe', stripeRouter);

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const mongoose = await import('mongoose').then(m => m.default).catch(() => null);
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({ status: 'ok', db: states[mongoose?.connection.readyState ?? 0] ?? 'unknown' });
  });

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

  app.use('/api/auth', authRouter);
  app.use('/api/customer', customerRouter);
  app.use('/api/owner', ownerRouter);
  app.get('/api/plans', getPublicPlans);
  app.use('/api', apiRouter);

  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const distAdminPath = path.join(process.cwd(), 'dist-admin');
    const distOwnerPath = path.join(process.cwd(), 'dist-owner');

    app.use('/owner', express.static(distOwnerPath));
    app.get(['/owner', '/owner/*'], (_req, res) => {
      res.sendFile(path.join(distOwnerPath, 'owner.html'));
    });

    app.use('/admin', express.static(distAdminPath));
    app.get(['/admin', '/admin/*'], (_req, res) => {
      res.sendFile(path.join(distAdminPath, 'admin.html'));
    });

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  // Bind port first so Render health check passes immediately
  httpServer.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${env.PORT}`);
  });

  // Connect DB after port is bound
  connectDb()
    .then(() => runSeed().catch(e => console.warn('Seed skipped:', e.message)))
    .catch(e => console.error('MongoDB connection failed:', e.message));
}

startServer();
