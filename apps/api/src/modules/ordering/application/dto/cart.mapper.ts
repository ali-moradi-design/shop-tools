import type { CartView } from '@modules/ordering/domain/cart.entity';

export type CartDto = CartView;

export function toCartDto(view: CartView): CartDto {
  return view;
}
