export interface CartItem {
  productId: string;
  sku: string;
  quantity: number;
}

/**
 * A cart belongs to an owner key: `user:<userId>` for signed-in customers or
 * `guest:<id>` for visitors (the id lives in an httpOnly cookie).
 */
export interface Cart {
  id: string;
  owner: string;
  items: CartItem[];
  updatedAt: Date;
  createdAt: Date;
}

export const cartOwner = {
  user: (userId: string) => `user:${userId}`,
  guest: (guestId: string) => `guest:${guestId}`,
};

export interface AddCartItemInput {
  productId: string;
  sku: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  quantity: number;
}

/** A cart line with the product data the cart drawer needs. */
export interface CartLineView extends CartItem {
  slug: string;
  title: string;
  image?: string;
  /** Variant label, e.g. "2 × 4.0 Ah kit". */
  label: string;
  price: number;
  /** Units left in all warehouses. */
  available: number;
}

export interface CartView {
  id: string;
  items: CartLineView[];
  count: number;
  subtotal: number;
  currency: string;
}
