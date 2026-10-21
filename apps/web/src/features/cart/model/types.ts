export interface CartLine {
  productId: string;
  sku: string;
  quantity: number;
  slug: string;
  title: string;
  image?: string;
  size: string;
  width?: string;
  price: number;
  available: number;
}

export interface Cart {
  id: string;
  items: CartLine[];
  count: number;
  subtotal: number;
  currency: string;
}
