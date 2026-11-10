import { randomBytes } from 'node:crypto';
import Stripe from 'stripe';
import { env } from '@shared/config/env';
import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import type { PaymentGateway, WebhookVerifier } from '../../application/payments.port';
import { MockCheckout } from './mock-checkout';
import { MockStripeGateway } from './mock-stripe.gateway';
import { StripeGateway, StripeWebhookVerifier } from './stripe.gateway';

/**
 * Picks the payment provider: Stripe test mode when STRIPE_SECRET_KEY is set,
 * otherwise the local simulator. Both verify webhooks with the Stripe SDK.
 */
export function createPayments(orders: IOrderRepository): {
  gateway: PaymentGateway;
  verifier: WebhookVerifier;
  mock: { gateway: MockStripeGateway; checkout: MockCheckout } | null;
} {
  const storefrontUrl = env.STOREFRONT_URL.replace(/\/$/, '');
  if (env.STRIPE_SECRET_KEY) {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15_000 });
    return {
      gateway: new StripeGateway(stripe),
      verifier: new StripeWebhookVerifier(stripe, env.STRIPE_WEBHOOK_SECRET!),
      mock: null,
    };
  }
  // the SDK only signs and checks here, so it never calls Stripe with this key
  const stripe = new Stripe('sk_test_simulator');
  const secret = env.STRIPE_WEBHOOK_SECRET ?? `whsec_simulator_${randomBytes(24).toString('hex')}`;
  const gateway = new MockStripeGateway(
    stripe,
    secret,
    storefrontUrl,
    `http://127.0.0.1:${env.PORT}/api/v1/payments/stripe/webhook`,
  );
  return {
    gateway,
    verifier: new StripeWebhookVerifier(stripe, secret),
    mock: { gateway, checkout: new MockCheckout(orders, gateway, env.PAYMENT_CURRENCY, storefrontUrl) },
  };
}
