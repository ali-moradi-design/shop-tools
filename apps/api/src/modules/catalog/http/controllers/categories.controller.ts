import { Request, Response } from 'express';
import { categoryService } from '../../infra/wiring';
import { asyncHandler } from '@shared/http/asyncHandler';

export const list = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await categoryService.list() });
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json({ data: await categoryService.get(String(req.params.slug)) });
});

export const warehouses = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ data: await categoryService.listWarehouses() });
});
