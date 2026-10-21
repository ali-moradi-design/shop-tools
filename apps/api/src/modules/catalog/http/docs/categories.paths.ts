import { data, errors, list, path, ref } from '@shared/http/docs/helpers';

export const categoriesPaths = {
  '/api/v1/categories': {
    get: {
      tags: ['Catalog'],
      summary: 'Categories with product counts and their specification definitions',
      responses: { 200: { description: 'Categories', ...list('Category') } },
    },
  },
  '/api/v1/categories/{slug}': {
    get: {
      tags: ['Catalog'],
      summary: 'One category with its specification definitions',
      description: 'Each specification has a `key` (use it in `spec.<key>` filters), a base `unit` and the `units` a shopper can switch between (`factor` converts from the base unit).',
      parameters: [path('slug')],
      responses: { 200: { description: 'Category', ...data(ref('Category')) }, 404: errors[404] },
    },
  },
  '/api/v1/warehouses': {
    get: {
      tags: ['Catalog'],
      summary: 'Warehouses, in dispatch order',
      responses: { 200: { description: 'Warehouses', ...list('Warehouse') } },
    },
  },
} as const;
