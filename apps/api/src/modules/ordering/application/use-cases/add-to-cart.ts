import type { ICartRepository } from '@modules/ordering/domain/cart.repository';
import type { IProductRepository } from '@modules/catalog';
import type { Cart } from '@modules/ordering/domain/cart.entity';
import { DomainError } from '@shared/domain/DomainError';
import { assertPositiveQuantity, assertSufficientStock, findVariant } from '@modules/catalog';
import { mergeCartItem } from '@modules/ordering/domain/rules/cart.totals';

/** Keeps one visitor from growing a cart document without limit. */
export const MAX_CART_LINES = 50;

export class AddToCartUseCase {
  constructor(
    private readonly carts: ICartRepository,
    private readonly products: IProductRepository,
  ) {}

  async execute(owner: string, productId: string, sku: string, quantity: number): Promise<Cart> {
    assertPositiveQuantity(quantity);
    const product = await this.products.findById(productId);
    if (!product) throw new DomainError('Product not found', 'NOT_FOUND');

    const cart = await this.carts.getOrCreate(owner);
    const variant = findVariant(product, sku);
    const existing = cart.items.find((i) => i.productId === productId && i.sku === sku);
    const newQty = (existing?.quantity ?? 0) + quantity;
    assertSufficientStock(variant.stock, newQty, product.title);

    const items = mergeCartItem(cart.items, productId, sku, quantity);
    if (items.length > MAX_CART_LINES) {
      throw new DomainError(`A cart can hold up to ${MAX_CART_LINES} different items`, 'VALIDATION');
    }
    cart.items = items;
    return this.carts.save(cart);
  }
}
