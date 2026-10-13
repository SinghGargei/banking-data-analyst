import express, { Application, Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config/env';
import apiRouter from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { db } from './db/connection';

export function createApp(): Application {
  const app: Application = express();

  // Basic security and request parsing middleware
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Custom request logging
  app.use(requestLogger);

  // Health check endpoint
  app.get('/health', async (_req: Request, res: Response) => {
    const dbHealth = await db.checkHealth();
    const status = dbHealth.isHealthy ? 200 : 503;

    res.status(status).json({
      status: dbHealth.isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      database: dbHealth,
    });
  });

  // Serve static assets from public directory
  const publicDir = path.resolve(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // Serve Single-Page App at root
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Mount modular API routes
  app.use('/api', apiRouter);

  // 404 and Error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
