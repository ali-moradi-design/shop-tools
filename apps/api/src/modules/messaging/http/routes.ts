import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, requirePermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import { asyncHandler } from '@shared/http/asyncHandler';
import { AppError } from '@shared/errors/AppError';
import { env } from '@shared/config/env';
import { paginate } from '@shared/pagination';
import { prisma } from '@shared/infra/prisma/client';
import { newsletterService } from '../newsletter.service';
import { mailer } from '../mailer';

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10_000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many sign-ups from this address, try again later' },
});

const pageQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  to: z.string().trim().max(200).optional(),
});

export const newsletterRouter = Router();

newsletterRouter.post(
  '/',
  signupLimiter,
  validate({ body: z.object({ email: z.string().trim().email().max(200), source: z.string().max(40).optional() }) }),
  asyncHandler(async (req, res) => {
    await newsletterService.subscribe(req.body.email, req.body.source);
    res.status(202).json({ message: 'Subscribed' });
  }),
);

newsletterRouter.post(
  '/unsubscribe',
  validate({ body: z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) }) }),
  asyncHandler(async (req, res) => {
    if (!(await newsletterService.unsubscribe(req.body.token))) throw new AppError('This link is not valid', 404);
    res.json({ message: 'Unsubscribed' });
  }),
);

newsletterRouter.get(
  '/',
  authenticate,
  requirePermission('users:read'),
  validate({ query: pageQuery }),
  asyncHandler(async (req, res) => {
    res.json(await newsletterService.list(req.query as { page?: number; limit?: number }));
  }),
);

/** The outbox: every email the shop sent or would have sent. */
export const emailsRouter = Router();
emailsRouter.use(authenticate, requirePermission('users:read'));

emailsRouter.get(
  '/',
  validate({ query: pageQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as { page?: number; limit?: number; to?: string };
    const { page, limit, skip } = paginate(q.page, q.limit ?? 30);
    const where = q.to ? { to: q.to.toLowerCase() } : {};
    const [rows, total] = await Promise.all([
      prisma.emailMessage.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
        select: { id: true, to: true, subject: true, template: true, status: true, error: true, text: true, createdAt: true },
      }),
      prisma.emailMessage.count({ where }),
    ]);
    res.json({ data: rows, meta: { page, limit, total, pages: Math.ceil(total / limit), transport: mailer.mode } });
  }),
);
