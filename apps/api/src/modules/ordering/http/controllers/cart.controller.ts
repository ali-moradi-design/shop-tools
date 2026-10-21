import { Request, Response } from 'express';
import { cartService } from '../../infra/wiring';
import { asyncHandler } from '@shared/http/asyncHandler';
import { presentCart } from '../presenters/cart.presenter';
import { presentOrder } from '../presenters/order.presenter';
import { cartOwner } from '../../domain/cart.entity';
import { clearGuestCartCookie, readGuestCartId } from '../middleware/cartOwner';

export const get = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.get(req.cartOwner!);
  res.json({ data: await presentCart(cart) });
});

export const addItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.addItem(
    req.cartOwner!,
    req.body.productId,
    req.body.sku,
    req.body.quantity,
  );
  res.status(201).json({ data: await presentCart(cart) });
});

export const updateItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.updateItem(
    req.cartOwner!,
    String(req.params.productId),
    String(req.params.sku),
    req.body.quantity,
  );
  res.json({ data: await presentCart(cart) });
});

export const removeItem = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.removeItem(
    req.cartOwner!,
    String(req.params.productId),
    String(req.params.sku),
  );
  res.json({ data: await presentCart(cart) });
});

export const clear = asyncHandler(async (req: Request, res: Response) => {
  const cart = await cartService.clear(req.cartOwner!);
  res.json({ data: await presentCart(cart) });
});

/** After sign-in: move the visitor's cart into the customer's cart. */
export const merge = asyncHandler(async (req: Request, res: Response) => {
  const guestId = readGuestCartId(req);
  const cart = guestId
    ? await cartService.mergeGuestCart(req.user!.id, cartOwner.guest(guestId))
    : await cartService.get(cartOwner.user(req.user!.id));
  clearGuestCartCookie(res);
  res.json({ data: await presentCart(cart) });
});

export const quote = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await cartService.quote(req.cartOwner!, req.body.discountCode) });
});

export const checkout = asyncHandler(async (req: Request, res: Response) => {
  const order = await cartService.checkout(
    req.user!.id,
    req.body.shippingAddress,
    req.body.discountCode,
  );
  res.status(201).json({ data: presentOrder(order) });
});
