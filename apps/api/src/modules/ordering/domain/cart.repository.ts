import type { Cart, CartItem } from './cart.entity';

export interface ICartRepository {
  findByOwner(owner: string): Promise<Cart | null>;
  getOrCreate(owner: string): Promise<Cart>;
  save(cart: Cart): Promise<Cart>;
  setItems(owner: string, items: CartItem[]): Promise<Cart>;
  clear(owner: string): Promise<Cart | null>;
  delete(owner: string): Promise<void>;
}
