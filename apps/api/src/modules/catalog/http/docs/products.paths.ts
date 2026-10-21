import { PRODUCT_CATEGORIES, PRODUCT_GENDERS } from '../../domain/product.entity';
import { data, errors, json, list, paged, path, query, ref, signedIn } from '@shared/http/docs/helpers';

const filters = [
  query('category', { type: 'string', enum: PRODUCT_CATEGORIES }),
  query('gender', { type: 'string', enum: PRODUCT_GENDERS }, 'Also returns unisex products'),
];

export const productsPaths = {
  '/api/v1/products': {
    get: {
      tags: ['Products'],
      summary: 'List and filter products',
      description:
        'Search (`q`) is a case-insensitive match on title, style name, color and description. `size`/`width` only match sizes that are in stock. Prices are in cents.',
      parameters: [
        query('q', { type: 'string', maxLength: 100 }),
        ...filters,
        query('style', { type: 'string' }, 'All colors of one style'),
        query('color', { type: 'string' }, 'Color family, e.g. Brown'),
        query('leather', { type: 'string' }, 'e.g. Full-Grain Leather, Suede'),
        query('size', { type: 'string' }, 'e.g. 10'),
        query('width', { type: 'string' }, 'e.g. Wide'),
        query('minPrice', { type: 'integer' }, 'Cents'),
        query('maxPrice', { type: 'integer' }, 'Cents'),
        query('inStock', { type: 'boolean' }),
        query('featured', { type: 'boolean' }),
        query('page', { type: 'integer', minimum: 1, default: 1 }),
        query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 24 }),
        query('sort', { type: 'string', enum: ['featured', 'price', 'title', 'createdAt'], default: 'featured' }),
        query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }),
      ],
      responses: { 200: { description: 'Products', ...paged('Product') }, 400: errors[400] },
    },
    post: {
      tags: ['Products'],
      summary: 'Create a product (admin)',
      security: signedIn,
      requestBody: { required: true, ...json(ref('ProductInput')) },
      responses: { 201: { description: 'Created', ...data(ref('Product')) }, 400: errors[400], 401: errors[401], 403: errors[403] },
    },
  },
  '/api/v1/products/featured': {
    get: { tags: ['Products'], summary: 'Featured products (home page)', responses: { 200: { description: 'Products', ...list('Product') } } },
  },
  '/api/v1/products/facets': {
    get: {
      tags: ['Products'],
      summary: 'Filter values with counts for a collection',
      parameters: filters,
      responses: { 200: { description: 'Facets', ...data(ref('ProductFacets')) } },
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
  '/api/v1/products/slug/{slug}/colors': {
    get: {
      tags: ['Products'],
      summary: 'All colors of the same style',
      parameters: [path('slug')],
      responses: { 200: { description: 'Products', ...list('Product') }, 404: errors[404] },
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
      description: 'Sending `variants` replaces all sizes and recalculates the total stock.',
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
