import type { ICartRepository } from '@modules/ordering/domain/cart.repository';
import type { Cart, CartItem } from '@modules/ordering/domain/cart.entity';
import { getPrisma, type PrismaTx } from '@shared/infra/prisma/client';
import { runInTransaction } from '@shared/infra/prisma/transaction';
import { mapCart } from './mappers';

const withItems = { items: true } as const;

/** Lines for the same product and size are one line: quantities add up. */
function mergeLines(items: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of items) {
    const key = `${item.productId}\u0000${item.sku}`;
    const line = merged.get(key);
    if (line) line.quantity += item.quantity;
    else merged.set(key, { ...item });
  }
  return [...merged.values()];
}

/** Replaces all lines of a cart and bumps its `updatedAt` (the guest cart cleanup reads it). */
async function replaceLines(tx: PrismaTx, cartId: string, items: CartItem[]): Promise<void> {
  await tx.cartItem.deleteMany({ where: { cartId } });
  const lines = mergeLines(items);
  if (lines.length) {
    await tx.cartItem.createMany({
      data: lines.map((i, position) => ({ cartId, productId: i.productId, sku: i.sku, quantity: i.quantity, position })),
    });
  }
  await tx.cart.update({ where: { id: cartId }, data: { updatedAt: new Date() } });
}

export class PrismaCartRepository implements ICartRepository {
  async findByOwner(owner: string): Promise<Cart | null> {
    const row = await getPrisma().cart.findUnique({ where: { owner }, include: withItems });
    return row ? mapCart(row) : null;
  }

  async getOrCreate(owner: string): Promise<Cart> {
    const row = await getPrisma().cart.upsert({
      where: { owner },
      update: {},
      create: { owner },
      include: withItems,
    });
    return mapCart(row);
  }

  async save(cart: Cart): Promise<Cart> {
    return runInTransaction(async (tx) => {
      const existing = await tx.cart.findUnique({ where: { id: cart.id }, select: { id: true } });
      if (!existing) throw new Error('Cart not found');
      await replaceLines(tx, cart.id, cart.items);
      return mapCart(await tx.cart.findUniqueOrThrow({ where: { id: cart.id }, include: withItems }));
    });
  }

  async setItems(owner: string, items: CartItem[]): Promise<Cart> {
    return runInTransaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { owner }, update: {}, create: { owner } });
      await replaceLines(tx, cart.id, items);
      return mapCart(await tx.cart.findUniqueOrThrow({ where: { id: cart.id }, include: withItems }));
    });
  }

  async clear(owner: string): Promise<Cart | null> {
    return runInTransaction(async (tx) => {
      const cart = await tx.cart.findUnique({ where: { owner }, select: { id: true } });
      if (!cart) return null;
      await replaceLines(tx, cart.id, []);
      return mapCart(await tx.cart.findUniqueOrThrow({ where: { id: cart.id }, include: withItems }));
    });
  }

  async delete(owner: string): Promise<void> {
    await getPrisma().cart.deleteMany({ where: { owner } });
  }

  async purgeStaleGuestCarts(before: Date): Promise<number> {
    const { count } = await getPrisma().cart.deleteMany({
      where: { owner: { startsWith: 'guest:' }, updatedAt: { lt: before } },
    });
    return count;
  }
}
