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
import { errorHandler } from './middleware/errorHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  await connectDb();

  const app = express();
  const httpServer = createServer(app);
  initSocket(httpServer);

  app.use(cors());
  app.use(express.json());

  // Serve uploaded images
  app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

  app.use('/api/auth', authRouter);
  app.use('/api/customer', customerRouter);
  app.use('/api/owner', ownerRouter);
  app.use('/api', apiRouter);

  if (env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const distOwnerPath = path.join(process.cwd(), 'dist-owner');

    app.use('/owner', express.static(distOwnerPath));
    app.get(['/owner', '/owner/*'], (_req, res) => {
      res.sendFile(path.join(distOwnerPath, 'owner.html'));
    });

    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  httpServer.listen(env.PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${env.PORT}`);
  });
}

startServer();
