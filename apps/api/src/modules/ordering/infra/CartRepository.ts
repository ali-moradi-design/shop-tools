import type { ICartRepository } from '@modules/ordering/domain/cart.repository';
import type { Cart, CartItem } from '@modules/ordering/domain/cart.entity';
import { CartModel } from './models/CartModel';
import { mapCart } from './mappers';

const toDocItems = (items: CartItem[]) =>
  items.map((i) => ({ productId: i.productId, sku: i.sku, quantity: i.quantity }));

export class MongooseCartRepository implements ICartRepository {
  async findByOwner(owner: string): Promise<Cart | null> {
    const doc = await CartModel.findOne({ owner });
    return doc ? mapCart(doc) : null;
  }

  async getOrCreate(owner: string): Promise<Cart> {
    const doc = await CartModel.findOneAndUpdate(
      { owner },
      { $setOnInsert: { owner, items: [] } },
      { upsert: true, returnDocument: 'after' },
    );
    return mapCart(doc!);
  }

  async save(cart: Cart): Promise<Cart> {
    const doc = await CartModel.findByIdAndUpdate(
      cart.id,
      { items: toDocItems(cart.items) },
      { returnDocument: 'after' },
    );
    if (!doc) throw new Error('Cart not found');
    return mapCart(doc);
  }

  async setItems(owner: string, items: CartItem[]): Promise<Cart> {
    const doc = await CartModel.findOneAndUpdate(
      { owner },
      { items: toDocItems(items), $setOnInsert: { owner } },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
    );
    return mapCart(doc!);
  }

  async clear(owner: string): Promise<Cart | null> {
    const doc = await CartModel.findOneAndUpdate(
      { owner },
      { items: [] },
      { returnDocument: 'after' },
    );
    return doc ? mapCart(doc) : null;
  }

  async delete(owner: string): Promise<void> {
    await CartModel.deleteOne({ owner });
  }
}
