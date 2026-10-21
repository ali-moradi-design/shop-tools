import { randomUUID } from 'node:crypto';
import type { CookieOptions, Request, Response, NextFunction } from 'express';
import { env } from '@shared/config/env';
import { cartOwner } from '@modules/ordering/domain/cart.entity';

export const GUEST_CART_COOKIE = 'guestCart';
const UUID = /^[0-9a-f-]{36}$/i;

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: '/',
    maxAge: 30 * 24 * 3600 * 1000,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

export function readGuestCartId(req: Request): string | undefined {
  const id = (req.cookies as Record<string, string> | undefined)?.[GUEST_CART_COOKIE];
  return id && UUID.test(id) ? id : undefined;
}

export function clearGuestCartCookie(res: Response): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(GUEST_CART_COOKIE, options);
}

/**
 * Signed-in customers use their own cart; visitors get a guest cart whose id is
 * kept in an httpOnly cookie. Run after optionalAuthenticate.
 */
export function resolveCartOwner(req: Request, res: Response, next: NextFunction): void {
  if (req.user) {
    req.cartOwner = cartOwner.user(req.user.id);
    next();
    return;
  }
  let guestId = readGuestCartId(req);
  if (!guestId) {
    guestId = randomUUID();
    res.cookie(GUEST_CART_COOKIE, guestId, cookieOptions());
  }
  req.cartOwner = cartOwner.guest(guestId);
  next();
}
