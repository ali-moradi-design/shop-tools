'use client';

import { ApiError } from './types';

/** Browser calls go through the same-origin /api rewrite so cookies are sent. */
export async function clientApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body ? String(body.message) : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }
  return body as T;
}
