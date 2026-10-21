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
  '/api/v1/orders/{id}/pay': {
    post: {
      tags: ['Orders'],
      summary: 'Pay with the simulated gateway',
      description: 'The only payment method is `fake`. Takes the stock of each size atomically; if a size ran out the order becomes `failed` (409).',
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
