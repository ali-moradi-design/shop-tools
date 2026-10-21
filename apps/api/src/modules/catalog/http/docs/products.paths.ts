import { PRODUCT_SORTS } from '../../domain/product.entity';
import { data, errors, json, list, paged, path, query, ref, signedIn } from '@shared/http/docs/helpers';

const category = query('category', { type: 'string', example: 'drills' }, 'Category slug, see GET /categories');

export const productsPaths = {
  '/api/v1/products': {
    get: {
      tags: ['Products'],
      summary: 'List and filter products',
      description: [
        'Search (`q`) is a case-insensitive match on title, brand, model, description and SKU. Prices are in cents.',
        '',
        'Filter by specification with `spec.<key>=<value>` (needs `category`; keys come from GET /categories/{slug}).',
        'Numbers: `spec.torque=40..100Nm` (range with unit), `spec.torque=..100` (at most), `spec.voltage=18` (exact).',
        'Units come from the specification\'s family (`Nm`, `in·lb`, `mm`, `in`, `kg`, `lb` ...); without a unit the base unit is used.',
        'Words: `spec.motor=Brushless,Brushed`. Several filters combine with AND.',
      ].join('\n'),
      parameters: [
        query('q', { type: 'string', maxLength: 100 }),
        category,
        query('spec.{key}', { type: 'string' }, 'e.g. spec.torque=40..100Nm, spec.motor=Brushless'),
        query('warehouse', { type: 'string', example: 'BER' }, 'Only products with units on the shelf of this warehouse'),
        query('minPrice', { type: 'integer' }, 'Cents'),
        query('maxPrice', { type: 'integer' }, 'Cents'),
        query('inStock', { type: 'boolean' }),
        query('featured', { type: 'boolean' }),
        query('page', { type: 'integer', minimum: 1, default: 1 }),
        query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 24 }),
        query('sort', { type: 'string', enum: PRODUCT_SORTS, default: 'featured' }),
        query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
      ],
      responses: { 200: { description: 'Products', ...paged('Product') }, 400: errors[400] },
    },
    post: {
      tags: ['Products'],
      summary: 'Create a product (admin)',
      security: signedIn,
      requestBody: { required: true, ...json(ref('ProductInput')) },
      responses: { 201: { description: 'Created', ...data(ref('Product')) }, 400: errors[400], 401: errors[401], 403: errors[403], 409: { description: 'Slug or SKU already used' } },
    },
  },
  '/api/v1/products/featured': {
    get: { tags: ['Products'], summary: 'Featured products (home page)', responses: { 200: { description: 'Products', ...list('Product') } } },
  },
  '/api/v1/products/facets': {
    get: {
      tags: ['Products'],
      summary: 'Filter values for a category',
      description: 'For each filterable specification: the smallest and largest value (numbers) or the values with counts (words), and the units to show. Also the price range and how many products each warehouse has in stock.',
      parameters: [category],
      responses: { 200: { description: 'Facets', ...data(ref('ProductFacets')) } },
    },
  },
  '/api/v1/products/compare': {
    get: {
      tags: ['Products'],
      summary: 'Compare 2 to 4 products side by side',
      description: 'All products must be in the same category. Numbers are in the base unit; convert with each row\'s `units`. `best` marks the best value of a row where the specification has a direction.',
      parameters: [query('slugs', { type: 'string', example: 'dcd805e2t-gb,dcd701d2-gb' }, 'Comma-separated product slugs (2 to 4)')],
      responses: { 200: { description: 'Comparison', ...data(ref('Comparison')) }, 400: errors[400], 404: errors[404] },
    },
  },
  '/api/v1/products/slug/{slug}': {
    get: {
      tags: ['Products'],
      summary: 'Product by slug',
      parameters: [path('slug')],
      responses: { 200: { description: 'Product', ...data(ref('Product')) }, 404: errors[404] },
    },
  },
  '/api/v1/products/{id}': {
    get: {
      tags: ['Products'],
      summary: 'Product by id',
      parameters: [path('id')],
      responses: { 200: { description: 'Product', ...data(ref('Product')) }, 404: errors[404] },
    },
    patch: {
      tags: ['Products'],
      summary: 'Update a product (admin)',
      description: 'Only the fields you send change. Sending `variants` replaces all variants and their stock per warehouse; sending `specs` replaces all specification values.',
      security: signedIn,
      parameters: [path('id')],
      requestBody: { required: true, ...json(ref('ProductInput')) },
      responses: { 200: { description: 'Updated', ...data(ref('Product')) }, 400: errors[400], 403: errors[403], 404: errors[404] },
    },
    delete: {
      tags: ['Products'],
      summary: 'Soft-delete a product (admin)',
      security: signedIn,
      parameters: [path('id')],
      responses: { 200: { description: 'Deleted' }, 403: errors[403], 404: errors[404] },
    },
  },
} as const;
