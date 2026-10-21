import { ORDER_STATUSES } from '@modules/ordering/domain/order.entity';

const str = { type: 'string' } as const;
const int = { type: 'integer' } as const;
const cents = { type: 'integer', description: 'Minor units (cents)', example: 19900 } as const;
const strings = { type: 'array', items: str } as const;

/** OpenAPI schemas for the tools catalog, cart and orders. */
export const shopSchemas = {
  Warehouse: {
    type: 'object',
    properties: { code: { ...str, example: 'BER' }, name: { ...str, example: 'Berlin' }, city: str, sortOrder: int },
  },
  WarehouseStock: {
    type: 'object',
    properties: { warehouse: { ...str, example: 'BER' }, quantity: int },
  },
  UnitOption: {
    type: 'object',
    description: 'displayed value = base value × factor',
    properties: { symbol: { ...str, example: 'in·lb' }, factor: { type: 'number', example: 8.850746 } },
  },
  ProductVariant: {
    type: 'object',
    properties: {
      sku: { ...str, example: 'DCD805E2T-GB' },
      label: { ...str, example: '2 × 1.7 Ah kit' },
      price: { ...cents, description: 'Overrides the product price when set' },
      stock: { ...int, description: 'Total in all warehouses' },
      stockByWarehouse: { type: 'array', items: { $ref: '#/components/schemas/WarehouseStock' } },
    },
  },
  VariantInput: {
    type: 'object',
    required: ['sku', 'label', 'stock'],
    properties: {
      sku: str,
      label: str,
      price: cents,
      stock: { type: 'object', additionalProperties: int, example: { BER: 12, HAM: 4, MUC: 0 }, description: 'Units per warehouse code' },
    },
  },
  ProductSpecValue: {
    type: 'object',
    properties: {
      key: { ...str, example: 'torque' },
      label: { ...str, example: 'Max torque' },
      group: { ...str, example: 'Performance' },
      kind: { type: 'string', enum: ['number', 'text'] },
      unit: { ...str, example: 'Nm' },
      unitFamily: { ...str, example: 'torque' },
      value: { oneOf: [{ type: 'number' }, str], description: 'Numbers in the base unit' },
    },
  },
  ProductInput: {
    type: 'object',
    required: ['slug', 'title', 'category', 'price', 'variants'],
    properties: {
      slug: { ...str, pattern: '^[a-z0-9-]+$', example: 'dcd805e2t-gb' },
      title: { ...str, example: '18V XR Brushless Hammer Drill Driver' },
      brand: { ...str, example: 'DEWALT' },
      model: { ...str, example: 'DCD805E2T-GB' },
      category: { ...str, example: 'drills', description: 'Category slug' },
      description: str,
      features: strings,
      price: cents,
      compareAtPrice: cents,
      currency: { ...str, example: 'USD' },
      images: strings,
      variants: { type: 'array', items: { $ref: '#/components/schemas/VariantInput' } },
      specs: {
        type: 'object',
        additionalProperties: { oneOf: [{ type: 'number' }, str] },
        example: { voltage: 18, torque: 90, motor: 'Brushless' },
        description: 'Values by specification key; numbers in the base unit',
      },
      tags: strings,
      featured: { type: 'boolean' },
      featuredOrder: int,
    },
  },
  Product: {
    type: 'object',
    properties: {
      id: str,
      slug: str,
      title: str,
      brand: str,
      model: str,
      category: { ...str, description: 'Category slug' },
      categoryName: str,
      description: str,
      features: strings,
      price: cents,
      compareAtPrice: cents,
      currency: str,
      images: strings,
      variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
      stock: { ...int, description: 'Total in all warehouses' },
      warehouses: { type: 'array', items: { $ref: '#/components/schemas/WarehouseStock' }, description: 'Stock of the whole product per warehouse' },
      specs: { type: 'array', items: { $ref: '#/components/schemas/ProductSpecValue' } },
      tags: strings,
      featured: { type: 'boolean' },
      featuredOrder: int,
      ratingAvg: { type: 'number', example: 4.7 },
      ratingCount: int,
      createdAt: { ...str, format: 'date-time' },
      updatedAt: { ...str, format: 'date-time' },
    },
  },
  SpecDefinition: {
    type: 'object',
    properties: {
      key: str,
      label: str,
      group: str,
      kind: { type: 'string', enum: ['number', 'text'] },
      unit: str,
      unitFamily: str,
      filterable: { type: 'boolean' },
      better: { type: 'string', enum: ['higher', 'lower'] },
      sortOrder: int,
      units: { type: 'array', items: { $ref: '#/components/schemas/UnitOption' } },
    },
  },
  Category: {
    type: 'object',
    properties: {
      slug: str,
      name: str,
      description: str,
      sortOrder: int,
      productCount: int,
      specs: { type: 'array', items: { $ref: '#/components/schemas/SpecDefinition' } },
    },
  },
  FacetCount: { type: 'object', properties: { value: str, count: int } },
  SpecFacet: {
    type: 'object',
    properties: {
      key: str,
      label: str,
      group: str,
      kind: { type: 'string', enum: ['number', 'text'] },
      unit: str,
      units: { type: 'array', items: { $ref: '#/components/schemas/UnitOption' } },
      min: { type: 'number', description: 'Numbers: smallest value (base unit)' },
      max: { type: 'number', description: 'Numbers: largest value (base unit)' },
      options: { type: 'array', items: { $ref: '#/components/schemas/FacetCount' }, description: 'Words: values with counts' },
      better: { type: 'string', enum: ['higher', 'lower'] },
    },
  },
  ProductFacets: {
    type: 'object',
    properties: {
      price: { type: 'object', properties: { min: cents, max: cents } },
      specs: { type: 'array', items: { $ref: '#/components/schemas/SpecFacet' } },
      warehouses: {
        type: 'array',
        items: { type: 'object', properties: { code: str, name: str, count: { ...int, description: 'Products with stock here' } } },
      },
    },
  },
  CompareRow: {
    type: 'object',
    properties: {
      key: str,
      label: str,
      group: str,
      kind: { type: 'string', enum: ['number', 'text'] },
      unit: str,
      units: { type: 'array', items: { $ref: '#/components/schemas/UnitOption' } },
      better: { type: 'string', enum: ['higher', 'lower'] },
      values: { type: 'array', items: { oneOf: [{ type: 'number' }, str, { nullable: true }] }, description: 'One per product, in order' },
      best: { type: 'array', items: { type: 'boolean' } },
      same: { type: 'boolean', description: 'All products have the same value' },
    },
  },
  Comparison: {
    type: 'object',
    properties: {
      category: { type: 'object', properties: { slug: str, name: str } },
      products: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
      rows: { type: 'array', items: { $ref: '#/components/schemas/CompareRow' } },
      warehouses: { type: 'array', items: { $ref: '#/components/schemas/Warehouse' } },
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
                label: str,
                price: cents,
                available: { ...int, description: 'Units left in all warehouses' },
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
    properties: {
      product: str,
      sku: str,
      label: str,
      title: str,
      image: str,
      price: cents,
      quantity: int,
      allocations: { type: 'array', items: { $ref: '#/components/schemas/WarehouseStock' }, description: 'Where the units were taken from (set when paid)' },
    },
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
