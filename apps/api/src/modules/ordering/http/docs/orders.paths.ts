import { ORDER_STATUSES } from '../../domain/order.entity';
import { data, errors, json, list, path, ref, signedIn } from '@shared/http/docs/helpers';

export const ordersPaths = {
  '/api/v1/orders': {
    get: {
      tags: ['Orders'],
      summary: 'My orders (all orders for staff)',
      security: signedIn,
      responses: { 200: { description: 'Orders', ...list('Order') }, 401: errors[401] },
    },
    post: {
      tags: ['Orders'],
      summary: 'Create an order from explicit items',
      security: signedIn,
      requestBody: { required: true, ...json(ref('CreateOrder')) },
      responses: { 201: { description: 'Order', ...data(ref('Order')) }, 400: errors[400], 401: errors[401] },
    },
  },
  '/api/v1/orders/{id}': {
    get: {
      tags: ['Orders'],
      summary: 'One order (own, or any for staff)',
      security: signedIn,
      parameters: [path('id')],
      responses: { 200: { description: 'Order', ...data(ref('Order')) }, 403: errors[403], 404: errors[404] },
    },
  },
  '/api/v1/orders/{id}/checkout': {
    post: {
      tags: ['Orders'],
      summary: 'Start paying an order (Stripe Checkout)',
      description: [
        'Returns the URL of a Stripe Checkout Session for the order (owner only, order must be `pending_payment`).',
        'An open session is reused, so two tabs cannot pay twice. Without a Stripe key (`mode: mock`) the URL opens the shop\'s own simulator at `/pay/<session id>`.',
        'The order becomes `paid` only when the signed `checkout.session.completed` webhook arrives (POST /payments/stripe/webhook); the redirect back proves nothing.',
      ].join('\n'),
      security: signedIn,
      parameters: [path('id')],
      responses: {
        200: { description: 'Where to send the customer', ...data({ type: 'object', properties: { url: { type: 'string' }, mode: { type: 'string', enum: ['stripe', 'mock'] } } }) },
        400: errors[400],
        403: errors[403],
        404: errors[404],
      },
    },
  },
  '/api/v1/orders/{id}/pay': {
    post: {
      tags: ['Orders'],
      summary: 'Record a payment by hand (staff)',
      description: 'For money received outside Stripe. Takes the stock warehouse by warehouse atomically; if an option ran out the order becomes `failed` (409). Customers get 403.',
      security: signedIn,
      parameters: [path('id')],
      responses: {
        200: { description: 'Paid order', ...data(ref('Order')) },
        403: errors[403],
        404: errors[404],
        409: { description: 'Insufficient stock' },
      },
    },
  },
  '/api/v1/payments/stripe/webhook': {
    post: {
      tags: ['Orders'],
      summary: 'Stripe webhook',
      description: 'Verified with the `Stripe-Signature` header. `checkout.session.completed` with the exact amount marks the order paid; retries are no-ops; a wrong amount is logged and ignored.',
      responses: { 200: { description: 'Received' }, 400: { description: 'Bad or missing signature' } },
    },
  },
  '/api/v1/orders/{id}/status': {
    patch: {
      tags: ['Orders'],
      summary: 'Change the status (staff)',
      description: 'Allowed: paid → processing → shipped → completed; cancel from pending, paid or processing (restocks paid orders).',
      security: signedIn,
      parameters: [path('id')],
      requestBody: {
        required: true,
        ...json({ type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ORDER_STATUSES }, note: { type: 'string' } } }),
      },
      responses: { 200: { description: 'Order', ...data(ref('Order')) }, 400: errors[400], 403: errors[403] },
    },
  },
} as const;
