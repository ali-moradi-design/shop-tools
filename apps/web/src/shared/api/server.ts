import 'server-only';
import { cookies } from 'next/headers';
import { API_V1 } from '@/shared/config';
import { ApiError } from './types';
import { visitorIpHeaders } from './visitor-ip';

async function call<T>(path: string, init: { method?: string; body?: string } = {}): Promise<T> {
  const jar = await cookies();
  const res = await fetch(`${API_V1}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      Cookie: jar.toString(),
      ...(await visitorIpHeaders()),
    },
  });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message = body && typeof body === 'object' && 'message' in body ? String(body.message) : `API ${res.status}`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}

/** Per-visitor API read from a server component: forwards the visitor's cookies. */
export function serverApi<T>(path: string): Promise<T> {
  return call<T>(path);
}

/**
 * API write from a Server Action, signed in as the visitor (their cookies).
 * The API checks the permissions, so a customer calling an admin action gets a 403.
 */
export function serverMutate<T = unknown>(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  return call<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}
