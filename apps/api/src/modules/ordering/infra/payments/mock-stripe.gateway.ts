import { randomBytes } from 'node:crypto';
import type Stripe from 'stripe';
import type { CheckoutSessionRef, CreateCheckoutInput, PaymentGateway } from '../../application/payments.port';

/**
 * A local stand-in for Stripe Checkout, for running the shop without a Stripe
 * account. Sessions open a checkout page in the storefront (/pay/<session id>);
 * paying there makes this simulator send the same signed `checkout.session.completed`
 * webhook Stripe would, to the same endpoint, so the confirm path is the real one.
 */
export class MockStripeGateway implements PaymentGateway {
  readonly mode = 'mock' as const;

  constructor(
    private readonly stripe: Stripe,
    private readonly webhookSecret: string,
    private readonly storefrontUrl: string,
    /** Where webhooks go; tests point it at their own server. */
    public webhookUrl: string,
  ) {}

  async createCheckoutSession(_input: CreateCheckoutInput): Promise<CheckoutSessionRef> {
    const id = `cs_test_mock_${randomBytes(16).toString('hex')}`;
    return { id, url: this.urlFor(id) };
  }

  async findOpenSession(id: string): Promise<CheckoutSessionRef | null> {
    return { id, url: this.urlFor(id) };
  }

  async refund(_paymentIntentId: string, _amount: number): Promise<string> {
    return `re_mock_${randomBytes(12).toString('hex')}`;
  }

  /** Builds, signs and delivers a webhook event, like Stripe's servers do. */
  async sendEvent(
    type: string,
    session: { id: string; orderId: string; amount: number; currency: string; paymentStatus: string },
  ): Promise<void> {
    const created = Math.floor(Date.now() / 1000);
    const payload = JSON.stringify({
      id: `evt_mock_${randomBytes(12).toString('hex')}`,
      object: 'event',
      api_version: '2026-10-28.endive',
      created,
      livemode: false,
      pending_webhooks: 1,
      type,
      data: {
        object: {
          id: session.id,
          object: 'checkout.session',
          mode: 'payment',
          status: session.paymentStatus === 'paid' ? 'complete' : 'open',
          payment_status: session.paymentStatus,
          amount_total: session.amount,
          currency: session.currency,
          client_reference_id: session.orderId,
          metadata: { orderId: session.orderId },
          payment_intent: `pi_mock_${randomBytes(12).toString('hex')}`,
          livemode: false,
        },
      },
    });
    const signature = this.stripe.webhooks.generateTestHeaderString({ payload, secret: this.webhookSecret });
    const res = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature, 'User-Agent': 'Stripe/1.0 (mock)' },
      body: payload,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Webhook endpoint answered ${res.status}`);
  }

  private urlFor(id: string): string {
    return `${this.storefrontUrl}/pay/${id}`;
  }
}

/** Stripe's test cards that the simulator understands. */
export const MOCK_CARDS: Record<string, { ok: true } | { ok: false; message: string }> = {
  '4242424242424242': { ok: true },
  '5555555555554444': { ok: true },
  '4000000000000002': { ok: false, message: 'Your card was declined.' },
  '4000000000009995': { ok: false, message: 'Your card has insufficient funds.' },
  '4000000000000069': { ok: false, message: 'Your card has expired.' },
  '4000000000000127': { ok: false, message: "Your card's security code is incorrect." },
};
