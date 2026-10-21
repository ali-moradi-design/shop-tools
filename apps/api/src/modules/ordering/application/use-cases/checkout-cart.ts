import type { ICartRepository } from '@modules/ordering/domain/cart.repository';
import type { IProductRepository } from '@modules/catalog';
import type { IOrderRepository } from '@modules/ordering/domain/order.repository';
import { cartOwner } from '@modules/ordering/domain/cart.entity';
import type { Order, ShippingAddress } from '@modules/ordering/domain/order.entity';
import type { DiscountService } from '@modules/promotions';
import { DomainError } from '@shared/domain/DomainError';
import { buildOrderLines } from '@modules/ordering/domain/rules/order.lines';
import {
  assertCartNotEmpty,
  computeSubtotal,
  computeOrderTotal,
} from '@modules/ordering/domain/rules/cart.totals';

export class CheckoutCartUseCase {
  constructor(
    private readonly carts: ICartRepository,
    private readonly products: IProductRepository,
    private readonly orders: IOrderRepository,
    private readonly discounts: DiscountService,
  ) {}

  async execute(
    userId: string,
    shippingAddress: ShippingAddress,
    discountCode?: string,
  ): Promise<Order> {
    const owner = cartOwner.user(userId);
    const cart = await this.carts.getOrCreate(owner);
    assertCartNotEmpty(cart.items);

    const productIds = [...new Set(cart.items.map((i) => i.productId))];
    const products = await this.products.findByIds(productIds);
    if (products.length !== productIds.length) {
      throw new DomainError('One or more products in cart not found', 'NOT_FOUND');
    }
    const orderItems = buildOrderLines(products, cart.items);

    const subtotalAmount = computeSubtotal(
      orderItems.map((i) => ({
        productId: i.product,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
      })),
    );

    const { discount, discountAmount } = await this.discounts.computeDiscount(
      discountCode,
      subtotalAmount,
    );

    const totalAmount = computeOrderTotal(subtotalAmount, discountAmount);

    const order = await this.orders.create({
      userId,
      items: orderItems,
      subtotalAmount,
      discountCode: discount?.code,
      discountAmount,
      totalAmount,
      shippingAddress,
    });

    if (discount) {
      await this.discounts.recordUse(discount.id);
    }

    await this.carts.clear(owner);
    return order;
  }
}
