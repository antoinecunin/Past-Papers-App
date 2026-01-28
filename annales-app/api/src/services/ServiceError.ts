/**
 * Erreur métier avec code HTTP associé
 * Permet aux services de signaler des erreurs avec un contexte HTTP
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  static badRequest(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, 400, details);
  }

  static unauthorized(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, 401, details);
  }

  static forbidden(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, 403, details);
  }

  static notFound(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, 404, details);
  }

  static conflict(message: string, details?: Record<string, unknown>): ServiceError {
    return new ServiceError(message, 409, details);
  }
}
