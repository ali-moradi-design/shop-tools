import { Money } from '@shared/domain/Money';
import { DomainError } from '@shared/domain/DomainError';
import type { CartItem } from '../cart.entity';

export interface PricedLine {
  productId: string;
  title: string;
  price: number;
  quantity: number;
}

export function assertCartNotEmpty(items: CartItem[]): void {
  if (items.length === 0) {
    throw new DomainError('Cart is empty', 'EMPTY_CART');
  }
}

const sameLine = (productId: string, sku: string) => (i: CartItem) =>
  i.productId === productId && i.sku === sku;

export function mergeCartItem(
  items: CartItem[],
  productId: string,
  sku: string,
  quantity: number,
): CartItem[] {
  const next = items.map((i) => ({ ...i }));
  const existing = next.find(sameLine(productId, sku));
  if (existing) {
    existing.quantity += quantity;
  } else {
    next.push({ productId, sku, quantity });
  }
  return next;
}

export function setCartItemQuantity(
  items: CartItem[],
  productId: string,
  sku: string,
  quantity: number,
): CartItem[] {
  const next = items.map((i) => ({ ...i }));
  const item = next.find(sameLine(productId, sku));
  if (!item) {
    throw new DomainError('Item not in cart', 'NOT_FOUND');
  }
  item.quantity = quantity;
  return next;
}

export function removeCartItem(items: CartItem[], productId: string, sku: string): CartItem[] {
  const next = items.filter((i) => !sameLine(productId, sku)(i));
  if (next.length === items.length) {
    throw new DomainError('Item not in cart', 'NOT_FOUND');
  }
  return next;
}

export function computeSubtotal(lines: PricedLine[], currency = 'USD'): number {
  let total = Money.of(0, currency);
  for (const line of lines) {
    total = total.add(Money.of(line.price, currency).multiply(line.quantity));
  }
  return total.amount;
}

export function computeOrderTotal(subtotal: number, discountAmount: number, currency = 'USD'): number {
  return Money.of(subtotal, currency).subtract(Money.of(discountAmount, currency)).amount;
}
