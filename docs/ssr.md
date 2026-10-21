# Why server-side rendering (SSR)

`leather-shop` used Partial Prerendering (PPR): a static page shell, catalog reads in
a cache tagged `products`, and Suspense "holes" for per-visitor data. That fits a
catalog that changes a few times a day. The tools shop is different:

- **Prices and stock must be current.** A buyer must not see "in stock" for something
  the last order just took, or yesterday's price. With PPR we had to invalidate the
  cache by hand (an admin action, a webhook the nightly reset called). With SSR there is
  nothing to invalidate: each request asks the API.
- **Spec filters make caching weak anyway.** Combinations of ranges and units are
  nearly unique per visitor, so a cache would rarely hit.
- **A real CSP.** A nonce is a random value made for one response; only scripts that
  carry it may run. That is impossible on a prerendered page (the same HTML is served
  to everyone). The PPR shop had to allow `'unsafe-inline'` scripts; the tools shop does not.

How it is done:

- `export const dynamic = 'force-dynamic'` in `src/app/layout.tsx`: every route renders on demand
  (`next build` shows only `ƒ` routes, and needs no API at build time).
- `src/proxy.ts` (Next.js 16's replacement for middleware) creates the nonce per request
  and sets the `Content-Security-Policy` header; `src/shared/config/csp.ts` builds the policy.
- `apps/web/src/shared/api/fetcher.ts` calls the API with `cache: 'no-store'`.
- Streaming still works: slow parts sit inside Suspense and arrive after the shell.

Cost: every page view runs React on the server and calls the API (and MySQL). For a demo
on one VPS this is fine; if traffic grew, cache the public catalog for a few seconds at
Nginx or in the API rather than going back to prerendering.

Tests: `apps/web/e2e/ssr.spec.ts` checks the nonce (different on every request, on every
script), the cache headers, and that a price change shows on the next page view.
