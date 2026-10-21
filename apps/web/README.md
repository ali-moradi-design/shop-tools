# @st/web — Welt & Grain storefront

Next.js (App Router) with Partial Prerendering (Cache Components): the page shell
and catalog reads are cached (`'use cache'`, tag `products`); per-visitor parts
(cart, account, live stock) are Suspense holes.

Structure follows Feature-Sliced Design: `app` (routes) → `widgets` → `features`
→ `entities` → `shared`.

The browser reaches the API through the same origin: the `/api/[...path]` route
handler proxies to `API_URL` (read at runtime), so the API's httpOnly cookies are
first-party and the visitor's IP is passed on for rate limits.

```bash
cp .env.example .env.local   # API_URL=http://localhost:4000
pnpm dev                     # needs the API running (see ../api)
pnpm build                   # prerendering reads the API too
```
