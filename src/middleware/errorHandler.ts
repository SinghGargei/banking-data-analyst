import { Request, Response, NextFunction } from 'express';
import { ApiResponse, AppError } from '../types/express.types';

export function errorHandler(
  err: Error | (Error & { statusCode?: number; isOperational?: boolean }),
  _req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void {
  const statusCode =
    'statusCode' in err && typeof err.statusCode === 'number'
      ? err.statusCode
      : err instanceof AppError
      ? err.statusCode
      : 500;
  const isOperational =
    'isOperational' in err && typeof err.isOperational === 'boolean'
      ? err.isOperational
      : err instanceof AppError
      ? err.isOperational
      : false;

  console.error(`[Error Handler] ${err.name}: ${err.message}`);
  if (!isOperational && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: err.message || 'An unexpected internal server error occurred',
    meta: {
      timestamp: new Date().toISOString(),
      statusCode,
    },
  });
}

export function notFoundHandler(req: Request, res: Response<ApiResponse>): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    meta: {
      timestamp: new Date().toISOString(),
      statusCode: 404,
    },
  });
}
