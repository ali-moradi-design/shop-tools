import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@/entities/user';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';

/** The signed-in customer, or a redirect to sign-in that returns to `from`. */
export async function requireUser(from: string): Promise<User> {
  try {
    return (await serverApi<{ data: User }>('/users/me')).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect(`/account/login?next=${encodeURIComponent(from)}`);
    }
    throw err;
  }
}
