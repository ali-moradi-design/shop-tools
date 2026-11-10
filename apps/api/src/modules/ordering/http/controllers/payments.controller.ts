import type { Request, Response } from 'express';
import { checkoutService, payments } from '../../infra/wiring';
import { asyncHandler } from '@shared/http/asyncHandler';
import { AppError } from '@shared/errors/AppError';

/** POST /orders/:id/checkout — the Checkout Session URL to send the customer to. */
export const startCheckout = asyncHandler(async (req: Request, res: Response) => {
  const { url } = await checkoutService.start(String(req.params.id), req.user!.id);
  res.json({ data: { url, mode: checkoutService.mode } });
});

/** POST /payments/stripe/webhook — body is the raw Buffer, needed for the signature. */
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  if (!Buffer.isBuffer(req.body)) throw new AppError('Expected a raw JSON body', 400);
  await checkoutService.handleWebhook(req.body, req.header('stripe-signature'));
  res.json({ received: true });
});

function simulator() {
  if (!payments.mock) throw new AppError('Not found', 404);
  return payments.mock.checkout;
}

/** GET /payments/simulator/sessions/:id — what the simulated Checkout page shows. */
export const describeSimulatedSession = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await simulator().describe(String(req.params.id), req.user!.id) });
});

/** POST /payments/simulator/sessions/:id/pay — pays with a Stripe test card. */
export const paySimulatedSession = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await simulator().pay(String(req.params.id), req.user!.id, req.body.card) });
});
