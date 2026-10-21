import type { ICartRepository } from '@modules/ordering/domain/cart.repository';
import type { IProductRepository } from '@modules/catalog';
import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import {
  cartOwner,
  type Cart,
  type CartLineView,
  type CartView,
} from '@modules/ordering/domain/cart.entity';
import type { Order, ShippingAddress } from '@modules/ordering/domain/order.entity';
import type { DiscountService } from '@modules/promotions';
import { DomainError } from '@shared/domain/DomainError';
import { assertPositiveQuantity, assertSufficientStock, findVariant } from '@modules/catalog';
import {
  setCartItemQuantity,
  removeCartItem,
  mergeCartItem,
  computeSubtotal,
} from '@modules/ordering/domain/rules/cart.totals';
import { AddToCartUseCase } from './use-cases/add-to-cart';
import { CheckoutCartUseCase } from './use-cases/checkout-cart';

/** All cart methods take an owner key (see `cartOwner`). */
export class CartService {
  private readonly addToCart: AddToCartUseCase;
  private readonly checkoutCart: CheckoutCartUseCase;

  constructor(
    private readonly carts: ICartRepository,
    private readonly products: IProductRepository,
    orders: IOrderRepository,
    private readonly discounts: DiscountService,
  ) {
    this.addToCart = new AddToCartUseCase(carts, products);
    this.checkoutCart = new CheckoutCartUseCase(carts, products, orders, discounts);
  }

  async get(owner: string): Promise<Cart> {
    return this.carts.getOrCreate(owner);
  }

  addItem(owner: string, productId: string, sku: string, quantity: number): Promise<Cart> {
    return this.addToCart.execute(owner, productId, sku, quantity);
  }

  async updateItem(owner: string, productId: string, sku: string, quantity: number): Promise<Cart> {
    assertPositiveQuantity(quantity);
    const product = await this.products.findById(productId);
    if (!product) throw new DomainError('Product not found', 'NOT_FOUND');
    assertSufficientStock(findVariant(product, sku).stock, quantity, product.title);

    const cart = await this.carts.getOrCreate(owner);
    cart.items = setCartItemQuantity(cart.items, productId, sku, quantity);
    return this.carts.save(cart);
  }

  async removeItem(owner: string, productId: string, sku: string): Promise<Cart> {
    const cart = await this.carts.getOrCreate(owner);
    cart.items = removeCartItem(cart.items, productId, sku);
    return this.carts.save(cart);
  }

  async clear(owner: string): Promise<Cart> {
    const cart = await this.carts.clear(owner);
    if (!cart) return this.carts.getOrCreate(owner);
    return cart;
  }

  /**
   * Moves a guest cart into the user's cart after sign-in. Quantities are added and
   * capped at the stock left in each size; lines that are gone or sold out are dropped.
   */
  async mergeGuestCart(userId: string, guestOwner: string): Promise<Cart> {
    const owner = cartOwner.user(userId);
    const guest = await this.carts.findByOwner(guestOwner);
    const cart = await this.carts.getOrCreate(owner);
    if (!guest || guest.items.length === 0) return cart;

    const products = await this.products.findByIds([
      ...new Set(guest.items.map((i) => i.productId)),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    let items = cart.items;
    for (const line of guest.items) {
      const variant = byId.get(line.productId)?.variants.find((v) => v.sku === line.sku);
      if (!variant || variant.stock === 0) continue;
      items = mergeCartItem(items, line.productId, line.sku, line.quantity);
      const merged = items.find((i) => i.productId === line.productId && i.sku === line.sku)!;
      merged.quantity = Math.min(merged.quantity, variant.stock);
    }
    await this.carts.delete(guestOwner);
    return this.carts.setItems(owner, items);
  }

  /** The cart with current product data, prices and stock for each line. */
  async view(cart: Cart): Promise<CartView> {
    const products = await this.products.findByIds([
      ...new Set(cart.items.map((i) => i.productId)),
    ]);
    const byId = new Map(products.map((p) => [p.id, p]));
    const items: CartLineView[] = [];
    for (const line of cart.items) {
      const product = byId.get(line.productId);
      const variant = product?.variants.find((v) => v.sku === line.sku);
      if (!product || !variant) continue;
      items.push({
        ...line,
        slug: product.slug,
        title: product.title,
        image: product.images[0],
        size: variant.size,
        width: variant.width,
        price: product.price,
        available: variant.stock,
      });
    }
    return {
      id: cart.id,
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: computeSubtotal(items),
      currency: 'USD',
    };
  }

  /** Totals for the checkout page, with an optional discount code applied. */
  async quote(owner: string, discountCode?: string) {
    const cart = await this.view(await this.carts.getOrCreate(owner));
    const { discount, discountAmount } = await this.discounts.computeDiscount(
      discountCode,
      cart.subtotal,
    );
    return {
      ...cart,
      discountCode: discount?.code,
      discountAmount,
      total: cart.subtotal - discountAmount,
    };
  }

  checkout(
    userId: string,
    shippingAddress: ShippingAddress,
    discountCode?: string,
  ): Promise<Order> {
    return this.checkoutCart.execute(userId, shippingAddress, discountCode);
  }
}
