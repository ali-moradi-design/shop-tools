import Stripe from 'stripe';
import type {
  CheckoutSessionRef,
  CreateCheckoutInput,
  PaymentEvent,
  PaymentGateway,
  WebhookVerifier,
} from '../../application/payments.port';

/** Stripe Checkout in test mode (the env check refuses live keys). */
export class StripeGateway implements PaymentGateway {
  readonly mode = 'stripe' as const;
  constructor(private readonly stripe: Stripe) {}

  async createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionRef> {
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: input.orderId,
        metadata: { orderId: input.orderId },
        payment_intent_data: { metadata: { orderId: input.orderId } },
        line_items: input.lines.map((l) => ({
          quantity: l.quantity,
          price_data: {
            currency: input.currency,
            unit_amount: l.unitAmount,
            product_data: {
              name: l.title,
              // Stripe fetches images itself, so only public https URLs work
              ...(l.image?.startsWith('https://') ? { images: [l.image] } : {}),
            },
          },
        })),
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
      },
      // a double click must not open two sessions for one order
      { idempotencyKey: `checkout-${input.orderId}-${input.amount}-${Math.floor(Date.now() / 60_000)}` },
    );
    if (!session.url) throw new Error('Stripe returned a session without a URL');
    return { id: session.id, url: session.url };
  }

  async refund(paymentIntentId: string, amount: number): Promise<string> {
    const refund = await this.stripe.refunds.create(
      { payment_intent: paymentIntentId, amount },
      { idempotencyKey: `refund-${paymentIntentId}-${amount}` },
    );
    return refund.id;
  }

  async findOpenSession(id: string): Promise<CheckoutSessionRef | null> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(id);
      return session.status === 'open' && session.url ? { id: session.id, url: session.url } : null;
    } catch {
      return null;
    }
  }
}

/** Checks the Stripe-Signature header with the endpoint's signing secret. */
export class StripeWebhookVerifier implements WebhookVerifier {
  constructor(
    private readonly stripe: Stripe,
    private readonly secret: string,
  ) {}

  verify(rawBody: Buffer, signature: string | undefined): PaymentEvent {
    if (!signature) throw new Error('Missing Stripe-Signature header');
    const event = this.stripe.webhooks.constructEvent(rawBody, signature, this.secret);
    const object = event.data.object as Partial<Stripe.Checkout.Session>;
    const intent = object.payment_intent;
    return {
      id: event.id,
      type: event.type,
      session: {
        id: String(object.id ?? ''),
        paymentStatus: String(object.payment_status ?? ''),
        amountTotal: object.amount_total ?? null,
        currency: object.currency ?? null,
        orderId: object.client_reference_id ?? object.metadata?.orderId ?? undefined,
        paymentIntent: typeof intent === 'string' ? intent : intent?.id,
      },
    };
  }
}
