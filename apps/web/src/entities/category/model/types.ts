import type { UnitOption } from '@/shared/lib/units';

export interface SpecDefinition {
  key: string;
  label: string;
  group: string;
  kind: 'number' | 'text';
  unit?: string;
  unitFamily?: string;
  filterable: boolean;
  better?: 'higher' | 'lower';
  sortOrder: number;
  units: UnitOption[];
}

export interface Category {
  slug: string;
  name: string;
  description?: string;
  sortOrder: number;
  productCount?: number;
  specs: SpecDefinition[];
}

export interface Warehouse {
  code: string;
  name: string;
  city: string;
  sortOrder: number;
}
