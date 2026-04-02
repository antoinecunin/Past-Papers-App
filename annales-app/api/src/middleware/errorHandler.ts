import { Request, Response, NextFunction } from 'express';
import { ServiceError } from '../services/ServiceError.js';

/**
 * Wrapper pour les handlers async Express.
 * Attrape les erreurs et les transmet au middleware d'erreur centralisé.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware d'erreur centralisé.
 * Gère les ServiceError (erreurs métier) et les erreurs inattendues.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ServiceError) {
    return res.status(err.statusCode).json({ error: err.message, ...err.details });
  }
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
