import { Request, Response, NextFunction } from 'express';
import { AppError } from '@shared/errors/AppError';
import { asyncHandler } from '@shared/http/asyncHandler';
import { authContextService } from '../../infra/wiring';
import { hasAllPermissions, hasAnyPermission } from '../../domain/rules/hasPermission';
import { ACCESS_TOKEN_COOKIE, readCookie } from '../cookies/authCookies';

function resolveAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return readCookie(req, ACCESS_TOKEN_COOKIE);
}

export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = resolveAccessToken(req);
  if (!token) {
    throw new AppError('Authentication required', 401);
  }
  req.user = await authContextService.fromAccessToken(token);
  next();
});

/** Sets req.user when a valid token is present; never rejects the request. */
export const optionalAuthenticate = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = resolveAccessToken(req);
    if (token) {
      try {
        req.user = await authContextService.fromAccessToken(token);
      } catch {
        // expired or invalid token: continue as a visitor
      }
    }
    next();
  },
);

export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }
    if (!hasAllPermissions(req.user.permissions, required)) {
      next(new AppError('Forbidden: insufficient permissions', 403));
      return;
    }
    next();
  };
}

export function requireAnyPermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentication required', 401));
      return;
    }
    if (!hasAnyPermission(req.user.permissions, required)) {
      next(new AppError('Forbidden: insufficient permissions', 403));
      return;
    }
    next();
  };
}
