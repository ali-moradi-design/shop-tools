/**
 * The payment provider as the ordering module sees it. Stripe and the local
 * simulator both implement it, so the checkout code is the same for both.
 */

export interface CheckoutLine {
  title: string;
  /** Cents */
  unitAmount: number;
  quantity: number;
  image?: string;
}

export interface CreateCheckoutInput {
  orderId: string;
  /** Cents; what the customer pays after discounts */
  amount: number;
  currency: string;
  lines: CheckoutLine[];
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionRef {
  id: string;
  url: string;
}

export interface PaymentGateway {
  readonly mode: 'stripe' | 'mock';
  createCheckoutSession(input: CreateCheckoutInput): Promise<CheckoutSessionRef>;
  /** The session if the customer can still pay with it, else null (expired, completed). */
  findOpenSession(id: string): Promise<CheckoutSessionRef | null>;
  /** Refunds (part of) a payment; returns the refund id. */
  refund(paymentIntentId: string, amount: number): Promise<string>;
}

export type Refunder = Pick<PaymentGateway, 'refund'>;

/** The fields of a Stripe event the shop acts on. */
export interface PaymentEvent {
  id: string;
  type: string;
  session: {
    id: string;
    paymentStatus: string;
    amountTotal: number | null;
    currency: string | null;
    orderId?: string;
    paymentIntent?: string;
  };
}

export interface WebhookVerifier {
  /** Throws when the signature does not match the raw body. */
  verify(rawBody: Buffer, signature: string | undefined): PaymentEvent;
}
