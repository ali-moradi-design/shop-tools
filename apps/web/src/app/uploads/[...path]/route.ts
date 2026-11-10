import { API_URL } from '@/shared/config';

/**
 * Product photos uploaded in the admin live on the API (/uploads/...). This keeps
 * them on the shop's own origin, so the CSP (img-src 'self') and next/image work
 * without exposing the API. File names are unique, so they cache for a year.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  // only products/<file name>: no "..", no other folders, so it cannot reach other API paths
  if (path.length !== 2 || path[0] !== 'products' || !/^[\w-]+\.(jpg|png|webp|gif)$/.test(path[1])) {
    return new Response('Not found', { status: 404 });
  }
  const res = await fetch(`${API_URL}/uploads/${path.map(encodeURIComponent).join('/')}`, { cache: 'no-store' });
  if (!res.ok) return new Response('Not found', { status: res.status === 404 ? 404 : 502 });
  const headers = new Headers({
    'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
  });
  return new Response(res.body, { headers });
}
