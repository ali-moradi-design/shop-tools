import { Request, Response } from 'express';
import { reviewService } from '../../infra/wiring';
import { asyncHandler } from '@shared/http/asyncHandler';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await reviewService.list({
    product: req.query.product as string | undefined,
    user: req.query.user as string | undefined,
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 20,
  });
  res.json(result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.getById(String(req.params.id));
  res.json({ data: review });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.create({
    product: req.body.product,
    userId: req.user!.id,
    rating: req.body.rating,
    comment: req.body.comment,
  });
  res.status(201).json({ data: review });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.update(String(req.params.id), req.body, {
    id: req.user!.id,
    permissions: req.user!.permissions,
  });
  res.json({ data: review });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await reviewService.remove(String(req.params.id), {
    id: req.user!.id,
    permissions: req.user!.permissions,
  });
  res.json({ message: 'Review soft-deleted' });
});
