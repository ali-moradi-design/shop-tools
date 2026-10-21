import { PRODUCT_CATEGORIES, PRODUCT_GENDERS } from '@modules/catalog/domain/product.entity';
import { ORDER_STATUSES } from '@modules/ordering/domain/order.entity';

const str = { type: 'string' } as const;
const int = { type: 'integer' } as const;
const cents = { type: 'integer', description: 'Minor units (cents)', example: 19900 } as const;
const strings = { type: 'array', items: str } as const;

/** OpenAPI schemas for the leather catalog, cart and orders. */
export const shopSchemas = {
  ProductVariant: {
    type: 'object',
    required: ['sku', 'size', 'stock'],
    properties: {
      sku: { ...str, example: 'SBKDPL10' },
      size: { ...str, example: '10' },
      width: { ...str, example: 'Standard' },
      stock: int,
    },
  },
  ProductInput: {
    type: 'object',
    required: ['slug', 'title', 'name', 'style', 'color', 'colorFamily', 'category', 'gender', 'price', 'variants'],
    properties: {
      slug: { ...str, pattern: '^[a-z0-9-]+$', example: 'mens-diplomat-moc-toe-boot-badlands' },
      title: { ...str, example: 'Diplomat | Badlands' },
      name: { ...str, example: 'Diplomat', description: 'Style name' },
      style: { ...str, example: 'mens-diplomat', description: 'Shared by all colors of a style' },
      color: { ...str, example: 'Badlands' },
      colorFamily: { ...str, example: 'Brown', description: 'Broad color used by the filter' },
      colorGroup: { ...str, example: 'Classic Collection' },
      category: { type: 'string', enum: PRODUCT_CATEGORIES },
      gender: { type: 'string', enum: PRODUCT_GENDERS },
      description: str,
      features: strings,
      leather: { ...str, example: 'Full-Grain Leather' },
      construction: { ...str, example: 'Goodyear welt' },
      sole: str,
      price: cents,
      compareAtPrice: cents,
      currency: { ...str, example: 'USD' },
      images: strings,
      variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
      tags: strings,
      featured: { type: 'boolean' },
      featuredOrder: int,
    },
  },
  Product: {
    allOf: [
      { $ref: '#/components/schemas/ProductInput' },
      {
        type: 'object',
        properties: {
          id: str,
          stock: { ...int, description: 'Sum of the variants' },
          ratingAvg: { type: 'number', example: 4.7 },
          ratingCount: int,
          createdAt: { ...str, format: 'date-time' },
          updatedAt: { ...str, format: 'date-time' },
        },
      },
    ],
  },
  FacetCount: { type: 'object', properties: { value: str, count: int } },
  ProductFacets: {
    type: 'object',
    properties: {
      colors: { type: 'array', items: { $ref: '#/components/schemas/FacetCount' } },
      leathers: { type: 'array', items: { $ref: '#/components/schemas/FacetCount' } },
      sizes: { type: 'array', items: { $ref: '#/components/schemas/FacetCount' } },
      widths: { type: 'array', items: { $ref: '#/components/schemas/FacetCount' } },
      price: { type: 'object', properties: { min: cents, max: cents } },
    },
  },
  CartItem: {
    type: 'object',
    required: ['productId', 'sku', 'quantity'],
    properties: { productId: str, sku: str, quantity: { ...int, minimum: 1 } },
  },
  Cart: {
    type: 'object',
    properties: {
      id: str,
      items: {
        type: 'array',
        items: {
          allOf: [
            { $ref: '#/components/schemas/CartItem' },
            {
              type: 'object',
              properties: {
                slug: str,
                title: str,
                image: str,
                size: str,
                width: str,
                price: cents,
                available: { ...int, description: 'Stock left in this size' },
              },
            },
          ],
        },
      },
      count: int,
      subtotal: cents,
      currency: str,
    },
  },
  CartQuote: {
    allOf: [
      { $ref: '#/components/schemas/Cart' },
      { type: 'object', properties: { discountCode: str, discountAmount: cents, total: cents } },
    ],
  },
  OrderItem: {
    type: 'object',
    properties: { product: str, sku: str, size: str, width: str, title: str, image: str, price: cents, quantity: int },
  },
  Order: {
    type: 'object',
    properties: {
      id: str,
      user: str,
      items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
      subtotalAmount: cents,
      discountCode: str,
      discountAmount: cents,
      totalAmount: cents,
      status: { type: 'string', enum: ORDER_STATUSES },
      payment: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['fake'] },
          status: { type: 'string', enum: ['pending', 'paid', 'failed'] },
          paidAt: { ...str, format: 'date-time' },
          transactionId: str,
        },
      },
      shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
      createdAt: { ...str, format: 'date-time' },
    },
  },
  CreateOrder: {
    type: 'object',
    required: ['items', 'shippingAddress'],
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['product', 'sku', 'quantity'],
          properties: { product: str, sku: str, quantity: { ...int, minimum: 1 } },
        },
      },
      shippingAddress: { $ref: '#/components/schemas/ShippingAddress' },
      discountCode: str,
    },
  },
  Review: {
    type: 'object',
    properties: {
      id: str,
      product: { oneOf: [str, { type: 'object', properties: { _id: str, title: str, slug: str } }] },
      user: { oneOf: [str, { type: 'object', properties: { _id: str, name: str } }] },
      rating: { ...int, minimum: 1, maximum: 5 },
      comment: str,
      createdAt: { ...str, format: 'date-time' },
    },
  },
} as const;
