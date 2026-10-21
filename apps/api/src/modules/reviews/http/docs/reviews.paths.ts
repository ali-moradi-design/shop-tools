import { data, errors, json, path, query, ref, signedIn } from '@shared/http/docs/helpers';

export const reviewsPaths = {
  '/api/v1/reviews': {
    get: {
      tags: ['Reviews'],
      summary: 'List reviews (newest first)',
      description: 'Shows the reviewer name only, never the email.',
      parameters: [
        query('product', { type: 'string' }, 'Product id'),
        query('page', { type: 'integer', minimum: 1 }),
        query('limit', { type: 'integer', minimum: 1, maximum: 100 }),
      ],
      responses: { 200: { description: 'Reviews', ...json({ type: 'object', properties: { data: { type: 'array', items: ref('Review') } } }) } },
    },
    post: {
      tags: ['Reviews'],
      summary: 'Write a review',
      description: "Updates the product's ratingAvg and ratingCount.",
      security: signedIn,
      requestBody: {
        required: true,
        ...json({
          type: 'object',
          required: ['product', 'rating'],
          properties: { product: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string', maxLength: 2000 } },
        }),
      },
      responses: { 201: { description: 'Review', ...data(ref('Review')) }, 400: errors[400], 401: errors[401] },
    },
  },
  '/api/v1/reviews/{id}': {
    get: { tags: ['Reviews'], summary: 'One review', parameters: [path('id')], responses: { 200: { description: 'Review', ...data(ref('Review')) }, 404: errors[404] } },
    patch: {
      tags: ['Reviews'],
      summary: 'Edit a review (own, or any for staff)',
      security: signedIn,
      parameters: [path('id')],
      requestBody: json({ type: 'object', properties: { rating: { type: 'integer', minimum: 1, maximum: 5 }, comment: { type: 'string' } } }),
      responses: { 200: { description: 'Review', ...data(ref('Review')) }, 403: errors[403], 404: errors[404] },
    },
    delete: {
      tags: ['Reviews'],
      summary: 'Delete a review (own, or any for staff)',
      security: signedIn,
      parameters: [path('id')],
      responses: { 200: { description: 'Deleted' }, 403: errors[403], 404: errors[404] },
    },
  },
} as const;
