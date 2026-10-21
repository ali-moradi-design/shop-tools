import 'server-only';
import { cookies } from 'next/headers';
import { API_V1 } from '@/shared/config';
import { ApiError } from './types';

/** Per-visitor API read from a server component: forwards the visitor's cookies. */
export async function serverApi<T>(path: string): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API_V1}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json', Cookie: jar.toString() },
  });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? String(body.message) : `API ${res.status}`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}
