import express, { Router, type Express } from 'express';
import { z } from 'zod';
import { authenticate } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import * as ctrl from '../controllers/payments.controller';

const sessionParams = z.object({ id: z.string().regex(/^cs_test_mock_[a-f0-9]{32}$/) });
const payBody = z.object({
  card: z.string().min(12).max(23),
  expiry: z.string().max(9).optional(),
  cvc: z.string().max(4).optional(),
});

const router = Router();
router.get('/simulator/sessions/:id', authenticate, validate({ params: sessionParams }), ctrl.describeSimulatedSession);
router.post(
  '/simulator/sessions/:id/pay',
  authenticate,
  validate({ params: sessionParams, body: payBody }),
  ctrl.paySimulatedSession,
);
export default router;

/**
 * The webhook needs the exact bytes Stripe signed, so it is mounted before the
 * app-wide JSON parser. It carries no cookies, so the CSRF origin check skips it.
 */
export function registerPaymentWebhook(app: Express): void {
  app.post(
    '/api/v1/payments/stripe/webhook',
    express.raw({ type: 'application/json', limit: '256kb' }),
    ctrl.stripeWebhook,
  );
}
