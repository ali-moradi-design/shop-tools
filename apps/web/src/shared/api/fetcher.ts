import { API_V1 } from '@/shared/config';
import { ApiError } from './types';
import { visitorIpHeaders } from './visitor-ip';

export type FetchInit = RequestInit;

export async function apiGetJson<T>(path: string, init?: FetchInit): Promise<T> {
  const url = `${API_V1}${path.startsWith('/') ? path : `/${path}`}`;
  // SSR: every page render asks the API again, so prices and stock are always current
  const res = await fetch(url, {
    cache: 'no-store',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(await visitorIpHeaders()),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    // the body can be read once: as text, then parsed (a second read throws "Body is unusable")
    const text = await res.text().catch(() => '');
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON: keep the text */
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
