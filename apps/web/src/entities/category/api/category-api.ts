import { apiGetJson, ApiError, type ApiData } from '@/shared/api';
import type { Category, Warehouse } from '../model/types';

export async function fetchCategories(): Promise<Category[]> {
  return (await apiGetJson<ApiData<Category[]>>('/categories')).data;
}

export async function fetchCategory(slug: string): Promise<Category | null> {
  try {
    return (await apiGetJson<ApiData<Category>>(`/categories/${encodeURIComponent(slug)}`)).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  return (await apiGetJson<ApiData<Warehouse[]>>('/warehouses')).data;
}
