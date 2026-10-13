import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { db } from './db/connection';
import { initializeDatabase } from './db/schema';

async function bootstrap(): Promise<void> {
  console.log('==================================================');
  console.log(' Starting Banking Conversational Data Analyst API ');
  console.log('==================================================');
  console.log(`[Config] Environment : ${config.nodeEnv}`);
  console.log(`[Config] Port        : ${config.port}`);
  console.log(`[Config] DB Path     : ${config.databasePath}`);

  try {
    // 1. Verify connection and ensure database schema is initialized
    console.log('[Bootstrap] Initializing database...');
    await initializeDatabase();

    const health = await db.checkHealth();
    if (!health.isHealthy) {
      throw new Error(`Database ping check failed: ${health.details || 'unknown error'}`);
    }
    console.log('[Bootstrap] Database is healthy and ready for queries.');

    // 2. Initialize Express app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    server.listen(config.port, () => {
      console.log(`[Server] Server listening on http://localhost:${config.port}`);
      console.log(`[Server] Health check : http://localhost:${config.port}/health`);
      console.log(`[Server] API Overview : http://localhost:${config.port}/api`);
    });

    // 3. Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n[Shutdown] Received ${signal}. Closing server gracefully...`);

      server.close(async (err) => {
        if (err) {
          console.error('[Shutdown Error] Failed to close HTTP server cleanly:', err);
        } else {
          console.log('[Shutdown] HTTP server closed successfully.');
        }

        try {
          await db.close();
          console.log('[Shutdown] Database connection closed.');
          process.exit(0);
        } catch (dbErr) {
          console.error('[Shutdown Error] Failed to close database connection:', dbErr);
          process.exit(1);
        }
      });

      // Force terminate if graceful shutdown hangs
      setTimeout(() => {
        console.error('[Shutdown] Forced shutdown timed out after 10s.');
        process.exit(1);
      }, 10000).unref();
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[Fatal Error] Application bootstrap failed:', errorMsg);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Global process error safety guards
process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[Uncaught Exception]', err.message, err.stack);
  process.exit(1);
});

bootstrap();
