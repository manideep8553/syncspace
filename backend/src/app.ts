import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authenticate } from './middleware/authenticate.js';
import authRouter from './routes/auth.routes.js';
import documentRouter from './routes/document.routes.js';
import roomRouter from './routes/room.routes.js';
import workspaceRouter from './routes/workspace.routes.js';

export function createApp(): express.Express {
  const app = express();

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/rooms', authenticate, roomRouter);
  app.use('/api/workspaces', authenticate, workspaceRouter);
  app.use('/api/documents', authenticate, documentRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}