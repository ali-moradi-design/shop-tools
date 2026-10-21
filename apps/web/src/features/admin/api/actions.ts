'use server';

import { updateTag } from 'next/cache';
import { isAdmin, type User } from '@/entities/user';
import { serverApi } from '@/shared/api/server';

/** After an admin edit: drop the cached catalog so shoppers see the change now. */
export async function refreshCatalog(slug?: string): Promise<void> {
  const { data } = await serverApi<{ data: User }>('/users/me');
  if (!isAdmin(data)) throw new Error('Forbidden');
  updateTag('products');
  if (slug) updateTag(`product:${slug}`);
}
