import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  databasePath: string;
  corsOrigin: string;
  geminiApiKey: string;
}

const parsePort = (value: string | undefined, defaultPort: number): number => {
  if (!value) return defaultPort;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    console.warn(`[Config] Invalid PORT '${value}', falling back to default ${defaultPort}`);
    return defaultPort;
  }
  return parsed;
};

const resolveDatabasePath = (rawPath: string | undefined): string => {
  const defaultFilename = 'banking.db';
  if (!rawPath || rawPath.trim() === '') {
    return path.resolve(process.cwd(), defaultFilename);
  }
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
};

export const config: AppConfig = {
  port: parsePort(process.env.PORT, 3000),
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  databasePath: resolveDatabasePath(process.env.DATABASE_PATH),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
};
