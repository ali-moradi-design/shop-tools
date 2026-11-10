import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import { DomainError } from '@shared/domain/DomainError';
import { checkoutLines } from '../../application/checkout.service';
import { MOCK_CARDS, type MockStripeGateway } from './mock-stripe.gateway';

/**
 * The server side of the simulated Stripe Checkout page. Only mounted when no
 * Stripe key is set. Like Stripe's page it only talks about one session, and a
 * declined card is answered on the page without any webhook.
 */
export class MockCheckout {
  constructor(
    private readonly orders: IOrderRepository,
    private readonly gateway: MockStripeGateway,
    private readonly currency: string,
    private readonly storefrontUrl: string,
  ) {}

  async describe(sessionId: string, userId: string) {
    const order = await this.orderFor(sessionId, userId);
    return {
      id: sessionId,
      orderId: order.id,
      status: order.status,
      amount: order.totalAmount,
      currency: this.currency,
      lines: checkoutLines(order),
      cancelUrl: this.orderUrl(order.id, 'cancelled'),
    };
  }

  async pay(sessionId: string, userId: string, cardNumber: string): Promise<{ redirectUrl: string }> {
    const order = await this.orderFor(sessionId, userId);
    const successUrl = this.orderUrl(order.id, 'success');
    if (order.status !== 'pending_payment') return { redirectUrl: successUrl };

    const card = MOCK_CARDS[cardNumber.replace(/\D/g, '')];
    if (!card) {
      throw new DomainError('Use a Stripe test card, such as 4242 4242 4242 4242.', 'PAYMENT_DECLINED');
    }
    if (!card.ok) throw new DomainError(card.message, 'PAYMENT_DECLINED');

    await this.gateway.sendEvent('checkout.session.completed', {
      id: sessionId,
      orderId: order.id,
      amount: order.totalAmount,
      currency: this.currency,
      paymentStatus: 'paid',
    });
    return { redirectUrl: successUrl };
  }

  private async orderFor(sessionId: string, userId: string) {
    const order = await this.orders.findByCheckoutSession(sessionId);
    // someone else's session looks the same as a missing one
    if (!order || order.user !== userId) throw new DomainError('Checkout session not found', 'NOT_FOUND');
    return order;
  }

  private orderUrl(orderId: string, result: 'success' | 'cancelled') {
    return `${this.storefrontUrl}/account/orders/${orderId}?checkout=${result}`;
  }
}
