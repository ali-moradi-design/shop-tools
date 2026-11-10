import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticate, requireAnyPermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import { asyncHandler } from '@shared/http/asyncHandler';
import { env } from '@shared/config/env';
import { prisma } from '@shared/infra/prisma/client';

/*
 * A/B test events. The storefront picks each visitor's variant (a cookie set in
 * its proxy) and reports when a visitor saw an experiment and when they converted.
 * One row per visitor, experiment and event type, so counts are unique visitors.
 */

export const EVENT_TYPES = ['exposure', 'add_to_cart', 'purchase'] as const;
type EventType = (typeof EVENT_TYPES)[number];

/** Two-sided p-value of a two-proportion z-test (normal approximation). */
export function pValue(convA: number, nA: number, convB: number, nB: number): number | null {
  if (nA < 1 || nB < 1) return null;
  const pooled = (convA + convB) / (nA + nB);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / nA + 1 / nB));
  if (se === 0) return null;
  const z = Math.abs(convB / nB - convA / nA) / se;
  // Abramowitz–Stegun approximation of the normal CDF
  const t = 1 / (1 + 0.2316419 * z);
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const tail = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return Math.min(1, 2 * tail);
}

export async function experimentResults() {
  const groups = await prisma.experimentEvent.groupBy({ by: ['experiment', 'variant', 'type'], _count: { _all: true }, _min: { at: true } });
  const rows = groups.map((g) => ({ _id: { experiment: g.experiment, variant: g.variant, type: g.type as EventType }, n: g._count._all, first: g._min.at ?? new Date() }));
  const experiments = new Map<string, { started: Date; variants: Map<string, Record<EventType, number>> }>();
  for (const r of rows) {
    const e = experiments.get(r._id.experiment) ?? { started: r.first, variants: new Map() };
    if (r.first < e.started) e.started = r.first;
    const v = e.variants.get(r._id.variant) ?? { exposure: 0, add_to_cart: 0, purchase: 0 };
    v[r._id.type] = r.n;
    e.variants.set(r._id.variant, v);
    experiments.set(r._id.experiment, e);
  }
  return [...experiments].map(([key, e]) => {
    const variants = [...e.variants].sort(([a], [b]) => (a === 'control' ? -1 : b === 'control' ? 1 : a.localeCompare(b)));
    const control = e.variants.get('control') ?? variants[0]?.[1];
    return {
      key,
      started: e.started,
      variants: variants.map(([name, v]) => {
        const rate = (k: 'add_to_cart' | 'purchase') => (v.exposure ? v[k] / v.exposure : 0);
        const vs = (k: 'add_to_cart' | 'purchase') =>
          control && name !== 'control' && control.exposure
            ? { uplift: control[k] ? rate(k) / (control[k] / control.exposure) - 1 : null, pValue: pValue(control[k], control.exposure, v[k], v.exposure) }
            : null;
        return {
          name,
          visitors: v.exposure,
          addToCart: v.add_to_cart,
          purchases: v.purchase,
          addToCartRate: rate('add_to_cart'),
          purchaseRate: rate('purchase'),
          addToCartVsControl: vs('add_to_cart'),
          purchaseVsControl: vs('purchase'),
        };
      }),
    };
  });
}

const eventLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.NODE_ENV === 'test' ? 10_000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/);

export const experimentsRouter = Router();

experimentsRouter.post(
  '/events',
  eventLimiter,
  validate({
    body: z.object({
      visitor: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
      events: z.array(z.object({ experiment: slug, variant: slug, type: z.enum(EVENT_TYPES) })).min(1).max(10),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { visitor, events } = req.body as { visitor: string; events: { experiment: string; variant: string; type: EventType }[] };
    // the first variant recorded for a visitor wins, so a changed cookie cannot count twice
    await prisma.experimentEvent.createMany({ data: events.map((e) => ({ ...e, visitor })), skipDuplicates: true });
    res.status(204).end();
  }),
);

experimentsRouter.get(
  '/results',
  authenticate,
  requireAnyPermission('admin:dashboard', 'reports:analytics'),
  asyncHandler(async (_req, res) => {
    res.json({ data: await experimentResults() });
  }),
);
