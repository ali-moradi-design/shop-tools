import 'server-only';
import { redirect } from 'next/navigation';
import type { Account } from '@/features/account';
import { ApiError } from '@/shared/api';
import { serverApi } from '@/shared/api/server';

/**
 * The signed-in customer's account (profile and addresses), or a redirect to
 * sign-in. One request, where requireUser followed by /account took two in a row.
 */
export async function requireAccount(from: string): Promise<Account> {
  try {
    return (await serverApi<{ data: Account }>('/account')).data;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect(`/account/login?next=${encodeURIComponent(from)}`);
    throw err;
  }
}
