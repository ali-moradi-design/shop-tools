import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import type { Order } from '@modules/ordering/domain/order.entity';
import { DomainError } from '@shared/domain/DomainError';
import { logger } from '@shared/logging/logger';
import type { OrderService } from './order.service';
import type { CheckoutLine, PaymentEvent, PaymentGateway, WebhookVerifier } from './payments.port';

const log = logger.child({ module: 'payments' });

/** Events that mean a Checkout Session has been paid. */
const PAID_EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded']);

export interface CheckoutUrls {
  storefrontUrl: string;
  currency: string;
}

/**
 * Stripe Checkout flow: the customer is sent to a Checkout Session for an order,
 * and the order becomes paid only when Stripe's signed webhook says so. The
 * redirect back to the shop proves nothing, since anyone can open that URL.
 */
export class CheckoutService {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly orderService: OrderService,
    private readonly gateway: PaymentGateway,
    private readonly verifier: WebhookVerifier,
    private readonly config: CheckoutUrls,
  ) {}

  get mode() {
    return this.gateway.mode;
  }

  /** Returns the URL to send the customer to; reuses an open session so two tabs cannot pay twice. */
  async start(orderId: string, userId: string): Promise<{ url: string }> {
    const order = await this.orderService.getById(orderId, userId, false);
    if (order.status !== 'pending_payment') {
      throw new DomainError('Order is not awaiting payment', 'VALIDATION');
    }
    const existing = order.payment.checkoutSessionId;
    if (existing) {
      const open = await this.gateway.findOpenSession(existing);
      if (open) return { url: open.url };
    }
    const orderUrl = `${this.config.storefrontUrl}/account/orders/${order.id}`;
    const session = await this.gateway.createCheckoutSession({
      orderId: order.id,
      amount: order.totalAmount,
      currency: this.config.currency,
      lines: checkoutLines(order),
      successUrl: `${orderUrl}?checkout=success`,
      cancelUrl: `${orderUrl}?checkout=cancelled`,
    });
    order.payment = { ...order.payment, method: 'stripe', checkoutSessionId: session.id };
    await this.orders.save(order);
    return { url: session.url };
  }

  /**
   * Handles one webhook delivery. Bad signatures throw (400, so Stripe shows the
   * failure); everything else answers 200, because a retry would not change the outcome.
   */
  async handleWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    let event: PaymentEvent;
    try {
      event = this.verifier.verify(rawBody, signature);
    } catch (err) {
      log.warn('webhook signature rejected', { error: err instanceof Error ? err.message : String(err) });
      throw new DomainError('Invalid webhook signature', 'VALIDATION');
    }

    if (event.type === 'checkout.session.expired') return this.forgetSession(event);
    if (!PAID_EVENTS.has(event.type)) return;
    // bank debits and similar finish later with async_payment_succeeded
    if (event.session.paymentStatus !== 'paid') return;

    const order = await this.findOrder(event);
    if (!order) {
      log.warn('paid session without a matching order', { event: event.id, session: event.session.id });
      return;
    }
    if (event.session.amountTotal !== order.totalAmount || event.session.currency !== this.config.currency) {
      log.error('paid amount does not match the order', {
        event: event.id,
        order: order.id,
        paid: event.session.amountTotal,
        expected: order.totalAmount,
      });
      return;
    }
    const transactionId = event.session.paymentIntent ?? event.session.id;
    try {
      await this.orderService.confirmPayment(order.id, {
        method: 'stripe',
        transactionId,
        note: `Paid with Stripe${this.gateway.mode === 'mock' ? ' (simulated)' : ' (test mode)'}`,
      });
    } catch (err) {
      // out of stock, or the order was cancelled or paid through another session: staff refund it
      if (err instanceof DomainError) {
        log.error('payment received but the order could not be confirmed', {
          order: order.id,
          transactionId,
          reason: err.message,
        });
        return;
      }
      throw err;
    }
  }

  private async findOrder(event: PaymentEvent): Promise<Order | null> {
    const bySession = await this.orders.findByCheckoutSession(event.session.id);
    if (bySession) return bySession;
    // a newer session replaced this one on the order, but the customer paid the old one
    return event.session.orderId ? this.orders.findById(event.session.orderId).catch(() => null) : null;
  }

  private async forgetSession(event: PaymentEvent): Promise<void> {
    const order = await this.orders.findByCheckoutSession(event.session.id);
    if (!order || order.status !== 'pending_payment') return;
    order.payment = { ...order.payment, checkoutSessionId: undefined };
    await this.orders.save(order);
  }
}

/**
 * Stripe shows these lines on its page. A discount is spread into one line so the
 * total Stripe charges always equals the order total.
 */
export function checkoutLines(order: Order): CheckoutLine[] {
  if (order.discountAmount > 0) {
    const count = order.items.reduce((n, i) => n + i.quantity, 0);
    return [
      {
        title: `Order #${order.id.slice(-6).toUpperCase()} · ${count} item${count === 1 ? '' : 's'}, ${order.discountCode ?? 'discount'} applied`,
        unitAmount: order.totalAmount,
        quantity: 1,
        image: order.items[0]?.image,
      },
    ];
  }
  return order.items.map((i) => ({
    title: `${i.title} · ${i.label}`,
    unitAmount: i.price,
    quantity: i.quantity,
    image: i.image,
  }));
}
