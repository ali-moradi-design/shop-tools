import type { ICategoryRepository, IWarehouseRepository } from '../domain/product.repository';
import { unitsOf, type Category, type UnitOption, type Warehouse } from '../domain';
import { AppError } from '@shared/errors/AppError';

export type CategoryDto = Omit<Category, 'id' | 'specs'> & {
  specs: (Category['specs'][number] & { units: UnitOption[] })[];
};

/** A category with, for each specification, the units a shopper can switch between. */
function toDto({ id: _id, specs, ...rest }: Category): CategoryDto {
  return {
    ...rest,
    specs: specs.map((s) => ({
      ...s,
      units: unitsOf(s.unitFamily).length ? unitsOf(s.unitFamily) : s.unit ? [{ symbol: s.unit, factor: 1 }] : [],
    })),
  };
}

export class CategoryService {
  constructor(
    private readonly categories: ICategoryRepository,
    private readonly warehouses: IWarehouseRepository,
  ) {}

  async list(): Promise<CategoryDto[]> {
    return (await this.categories.list()).map(toDto);
  }

  async get(slug: string): Promise<CategoryDto> {
    const category = await this.categories.findBySlug(slug);
    if (!category) throw new AppError('Category not found', 404);
    return toDto(category);
  }

  listWarehouses(): Promise<Warehouse[]> {
    return this.warehouses.list();
  }
}
