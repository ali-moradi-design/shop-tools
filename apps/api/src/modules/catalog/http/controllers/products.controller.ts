import { Request, Response } from 'express';
import { productService } from '../../infra/wiring';
import { asyncHandler } from '@shared/http/asyncHandler';
import { presentProduct, presentProducts } from '../presenters/product.presenter';
import type { ProductListFilter } from '../../domain/product.entity';

// Query values were parsed by the zod schemas in validate(); see products.validation.ts.
// `spec.<key>` parameters are split off: the service turns them into typed filters.
export const list = asyncHandler(async (req: Request, res: Response) => {
  const specs: Record<string, string> = {};
  const fixed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (key.startsWith('spec.')) specs[key] = String(value);
    else fixed[key] = value;
  }
  const result = await productService.list(fixed as unknown as ProductListFilter, specs);
  res.json({ ...result, data: presentProducts(result.data) });
});

export const facets = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.facets(req.query as { category?: string });
  res.json({ data });
});

export const compare = asyncHandler(async (req: Request, res: Response) => {
  const { slugs } = req.query as unknown as { slugs: string[] };
  const result = await productService.compare(slugs);
  res.json({ data: { ...result, products: presentProducts(result.products) } });
});

export const listFeatured = asyncHandler(async (_req: Request, res: Response) => {
  const data = await productService.listFeatured(20);
  res.json({ data: presentProducts(data) });
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getById(String(req.params.id));
  res.json({ data: presentProduct(product) });
});

export const getBySlug = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getBySlug(String(req.params.slug));
  res.json({ data: presentProduct(product) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.create(req.body);
  res.status(201).json({ data: presentProduct(product) });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.update(String(req.params.id), req.body);
  res.json({ data: presentProduct(product) });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await productService.remove(String(req.params.id));
  res.json({ message: 'Product soft-deleted' });
});
