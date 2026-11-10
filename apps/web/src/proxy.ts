import { NextResponse, type NextRequest } from 'next/server';
import { buildCsp, createNonce } from '@/shared/config/csp';
import { AB_MAX_AGE, EXPERIMENTS, VISITOR_COOKIE, cookieName, isVariant, pickVariant, type ExperimentKey } from '@/shared/lib/ab/experiments';

/** Cookies a page request still needs: a visitor id and one sticky variant per A/B test. */
function missingAbCookies(request: NextRequest): [string, string][] {
  const { pathname } = request.nextUrl;
  // pages only: not the API proxy, uploaded photos or files with an extension
  if (pathname.startsWith('/api/') || pathname.startsWith('/uploads/') || /\.[a-z0-9]+$/i.test(pathname)) return [];
  const set: [string, string][] = [];
  if (!request.cookies.get(VISITOR_COOKIE)?.value) set.push([VISITOR_COOKIE, crypto.randomUUID().replace(/-/g, '')]);
  for (const key of Object.keys(EXPERIMENTS) as ExperimentKey[]) {
    if (!isVariant(key, request.cookies.get(cookieName(key))?.value)) set.push([cookieName(key), pickVariant(key, Math.random())]);
  }
  return set;
}

/**
 * Runs before every page request: makes the CSP nonce, passes it to the render (Next.js
 * puts it on its scripts) and sets the header on the response. It also gives a new
 * visitor an id and a sticky variant per A/B test before the page renders, so the server
 * renders the right variant with no flash; the cookies are added to this request too.
 * Prefetches skip this function (see the matcher); they carry the cookies set by the
 * first page view, and without them a page renders the control.
 */
export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'production');
  const ab = missingAbCookies(request);
  for (const [name, value] of ab) request.cookies.set(name, value);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  for (const [name, value] of ab) {
    response.cookies.set(name, value, { maxAge: AB_MAX_AGE, sameSite: 'lax', path: '/', secure: process.env.NODE_ENV === 'production' });
  }
  return response;
}

export const config = {
  matcher: [
    {
      // not for build output, optimized images or the favicon
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
