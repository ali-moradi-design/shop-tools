import { Request, Response } from 'express';
import { favoriteService } from '../../infra/wiring';
import { asyncHandler } from '@shared/http/asyncHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const data = await favoriteService.list(req.user!.id);
  res.json({ data });
});

export const add = asyncHandler(async (req: Request, res: Response) => {
  const fav = await favoriteService.add(req.user!.id, req.body.productId);
  res.status(201).json({ data: fav });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await favoriteService.remove(req.user!.id, String(req.params.productId));
  res.json({ message: 'Favorite removed' });
});
