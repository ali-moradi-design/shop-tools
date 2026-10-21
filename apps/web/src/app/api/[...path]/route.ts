import { API_URL } from '@/shared/config';

/**
 * Same-origin proxy to the API, so its httpOnly cookies are first-party.
 * A route handler (instead of a next.config rewrite) reads API_URL at runtime,
 * so one Docker image works with any API address, and it passes the visitor's
 * IP on in X-Forwarded-For for the API's rate limits.
 */
const FORWARD_REQUEST = ['accept', 'content-type', 'cookie', 'authorization', 'origin', 'referer', 'user-agent'];
const FORWARD_RESPONSE = ['content-type', 'cache-control', 'retry-after', 'ratelimit', 'ratelimit-policy'];

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const url = new URL(request.url);
  const target = `${API_URL}/api/${path.map(encodeURIComponent).join('/')}${url.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const clientIp = request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (clientIp) headers.set('x-forwarded-for', clientIp);

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const res = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: 'manual',
    cache: 'no-store',
  });

  const out = new Headers();
  for (const name of FORWARD_RESPONSE) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  for (const cookie of res.headers.getSetCookie()) out.append('set-cookie', cookie);
  return new Response(res.body, { status: res.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
