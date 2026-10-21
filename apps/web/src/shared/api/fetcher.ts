import { API_V1 } from '@/shared/config';
import { ApiError } from './types';

export type FetchInit = RequestInit & {
  next?: { revalidate?: number | false; tags?: string[] };
};

export async function apiGetJson<T>(path: string, init?: FetchInit): Promise<T> {
  const url = `${API_V1}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    const detail =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: unknown }).message)
        : typeof body === 'string'
          ? body
          : undefined;
    throw new ApiError(detail || `API ${res.status} for ${path}`, res.status, body);
  }
  return res.json() as Promise<T>;
}
