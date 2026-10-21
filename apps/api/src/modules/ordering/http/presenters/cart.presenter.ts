import type { Cart } from '@modules/ordering/domain/cart.entity';
import { toCartDto } from '@modules/ordering/application/dto/cart.mapper';
import { cartService } from '../../infra/wiring';

export async function presentCart(cart: Cart) {
  return toCartDto(await cartService.view(cart));
}
