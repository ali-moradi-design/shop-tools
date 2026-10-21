import type { NextFunction, Request, Response } from 'express';
import { AppError } from '@shared/errors/AppError';
import { resolveCorsOrigin } from '@shared/config/env';

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originOf(req: Request): string | undefined {
  const origin = req.headers.origin;
  if (origin) return origin;
  const referer = req.headers.referer;
  if (!referer) return undefined;
  try {
    return new URL(referer).origin;
  } catch {
    return undefined;
  }
}

/**
 * CSRF guard for cookie-authenticated writes. SameSite=Lax does not stop requests
 * from sibling subdomains (they count as the same site), so a browser write that
 * relies on cookies must come from an allowed origin. Bearer-token clients and
 * clients without Origin/Referer (curl, server-to-server) are not affected.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  const allowed = resolveCorsOrigin();
  if (!UNSAFE.has(req.method) || allowed === true) return next();
  if (req.headers.authorization?.startsWith('Bearer ')) return next();
  if (!req.headers.cookie) return next();

  const origin = originOf(req);
  if (!origin) return next();
  const list = allowed === false ? [] : Array.isArray(allowed) ? allowed : [allowed];
  if (list.includes(origin)) return next();
  next(new AppError('Cross-site request blocked', 403));
}
