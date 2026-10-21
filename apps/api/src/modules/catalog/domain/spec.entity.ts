export type SpecKind = 'number' | 'text';

/** What the shop shows and filters for one specification of a category. */
export interface SpecDefinition {
  key: string;
  label: string;
  /** Heading in the specs table ("Performance", "Battery" ...). */
  group: string;
  kind: SpecKind;
  /** Base unit symbol (numbers only); values are stored in it. */
  unit?: string;
  /** Which other units exist (see units.ts). */
  unitFamily?: string;
  filterable: boolean;
  /** For the compare table: which end of the range is better. */
  better?: 'higher' | 'lower';
  sortOrder: number;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description?: string;
  sortOrder: number;
  /** Live products in the category (list endpoint only). */
  productCount?: number;
  specs: SpecDefinition[];
}

export interface Warehouse {
  code: string;
  name: string;
  city: string;
  sortOrder: number;
}

/** One value of one specification of a product (numbers in the base unit). */
export interface ProductSpecValue {
  key: string;
  label: string;
  group: string;
  kind: SpecKind;
  unit?: string;
  unitFamily?: string;
  value: number | string;
}
