import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../../errors/AppError';
import { DomainError } from '../../domain/DomainError';
import { domainToAppError } from '../../errors/mapDomainError';
import { env } from '@shared/config/env';
import { logger } from '@shared/logging/logger';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      errors: err.flatten(),
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  const appErr = err instanceof DomainError ? domainToAppError(err) : err;

  if (appErr instanceof AppError) {
    res.status(appErr.statusCode).json({
      message: appErr.message,
      ...(appErr.errors !== undefined ? { errors: appErr.errors } : {}),
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  if (appErr instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: a unique value already exists; P2025: the row to change is gone;
    // P2003: a reference points at a row that does not exist
    const status = { P2002: 409, P2025: 404, P2003: 409 }[appErr.code];
    if (status) {
      const message = { 409: 'Duplicate or conflicting value', 404: 'Not found' }[status] ?? 'Error';
      res.status(status).json({
        message: appErr.code === 'P2002' ? 'Duplicate key' : message,
        ...(appErr.code === 'P2002' ? { errors: appErr.meta?.target } : {}),
        ...(requestId ? { requestId } : {}),
      });
      return;
    }
  }

  // errors raised by Express itself (invalid JSON, body too large, bad encoding) carry a 4xx status
  const clientStatus = (appErr as { status?: unknown; expose?: unknown } | null)?.status;
  if (typeof clientStatus === 'number' && clientStatus >= 400 && clientStatus < 500) {
    const type = (appErr as { type?: string }).type;
    res.status(clientStatus).json({
      message: type === 'entity.too.large' ? 'Request body too large' : 'Malformed request',
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  logger.error('unhandled_error', {
    requestId,
    err: appErr instanceof Error ? appErr.message : String(appErr),
    stack: appErr instanceof Error ? appErr.stack : undefined,
  });

  res.status(500).json({
    message: 'Internal server error',
    ...(requestId ? { requestId } : {}),
    ...(env.NODE_ENV === 'development' && appErr instanceof Error
      ? { errors: appErr.message }
      : {}),
  });
}
