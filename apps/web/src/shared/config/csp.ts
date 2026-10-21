/**
 * Content Security Policy for one response. `nonce` is a fresh random value per request:
 * only scripts carrying it (Next.js adds it to its own) may run, so an injected
 * `<script>` is blocked. This needs server-rendered pages, which is why the shop uses SSR.
 */
export function buildCsp(nonce: string, isProd: boolean): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic': scripts loaded by a trusted script are trusted too
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isProd ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    ...(isProd ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

/** A random, unguessable, base64 value for the CSP nonce. */
export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
