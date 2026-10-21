import { data, errors, json, path, ref, signedIn, signedInOrGuest } from '@shared/http/docs/helpers';

const cart = { description: 'The cart with product data and subtotal', ...data(ref('Cart')) };
const line = [path('productId'), path('sku', 'Size variant')];

export const cartPaths = {
  '/api/v1/cart': {
    get: {
      tags: ['Cart'],
      summary: 'Current cart (account or guest cookie)',
      description: 'Visitors without an account get a guest cart; the API sets the httpOnly `guestCart` cookie.',
      security: signedInOrGuest,
      responses: { 200: cart },
    },
    delete: { tags: ['Cart'], summary: 'Empty the cart', security: signedInOrGuest, responses: { 200: cart } },
  },
  '/api/v1/cart/items': {
    post: {
      tags: ['Cart'],
      summary: 'Add a size to the cart',
      description: 'Checks the stock of that size. A cart holds up to 50 different items.',
      security: signedInOrGuest,
      requestBody: { required: true, ...json(ref('CartItem')) },
      responses: { 201: cart, 400: errors[400], 404: errors[404], 409: { description: 'Insufficient stock' } },
    },
  },
  '/api/v1/cart/items/{productId}/{sku}': {
    patch: {
      tags: ['Cart'],
      summary: 'Change the quantity of a line',
      security: signedInOrGuest,
      parameters: line,
      requestBody: { required: true, ...json({ type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer', minimum: 1 } } }) },
      responses: { 200: cart, 400: errors[400], 404: errors[404], 409: { description: 'Insufficient stock' } },
    },
    delete: { tags: ['Cart'], summary: 'Remove a line', security: signedInOrGuest, parameters: line, responses: { 200: cart, 404: errors[404] } },
  },
  '/api/v1/cart/quote': {
    post: {
      tags: ['Cart'],
      summary: 'Totals for checkout, with an optional discount code',
      security: signedInOrGuest,
      requestBody: json({ type: 'object', properties: { discountCode: { type: 'string', example: 'WELCOME10' } } }),
      responses: { 200: { description: 'Totals', ...data(ref('CartQuote')) }, 400: errors[400] },
    },
  },
  '/api/v1/cart/merge': {
    post: {
      tags: ['Cart'],
      summary: 'Move the guest cart into the account (after sign-in)',
      description: 'Quantities are added and capped at the stock of each size; the guestCart cookie is cleared.',
      security: signedIn,
      responses: { 200: cart, 401: errors[401] },
    },
  },
  '/api/v1/cart/checkout': {
    post: {
      tags: ['Cart'],
      summary: 'Create an order from the cart (pending payment)',
      description: 'Prices come from the catalog; the cart is emptied. Pay with POST /orders/{id}/pay.',
      security: signedIn,
      requestBody: {
        required: true,
        ...json({
          type: 'object',
          required: ['shippingAddress'],
          properties: { shippingAddress: ref('ShippingAddress'), discountCode: { type: 'string' } },
        }),
      },
      responses: { 201: { description: 'Order', ...data(ref('Order')) }, 400: errors[400], 401: errors[401] },
    },
  },
} as const;
