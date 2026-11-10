'use client';

import { ApiError } from '@/shared/api/types';

/**
 * Sends one photo to the API's upload endpoint (through the same-origin /api
 * proxy, so the admin's cookies go along) and returns its shop URL. Files go
 * straight to the API instead of through a Server Action, which caps the body size.
 */
export async function uploadProductImage(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/v1/uploads/product-cover', { method: 'POST', body, credentials: 'same-origin' });
  const json = (await res.json().catch(() => undefined)) as { url?: string; message?: string } | undefined;
  if (!res.ok || !json?.url) throw new ApiError(json?.message ?? `Upload failed (${res.status})`, res.status, json);
  return json.url;
}
