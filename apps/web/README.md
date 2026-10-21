# @st/web — Welt & Grain storefront

Next.js (App Router), server-side rendered: every page is rendered per request
(`dynamic = 'force-dynamic'` in the root layout), so prices and stock are always
current and nothing needs to be invalidated. `src/proxy.ts` gives each response a
CSP nonce. Slow parts (live stock, reviews) stream inside Suspense boundaries.

Structure follows Feature-Sliced Design: `app` (routes) → `widgets` → `features`
→ `entities` → `shared`.

The browser reaches the API through the same origin: the `/api/[...path]` route
handler proxies to `API_URL` (read at runtime), so the API's httpOnly cookies are
first-party and the visitor's IP is passed on for rate limits.

```bash
cp .env.example .env.local   # API_URL=http://localhost:4000
pnpm dev                     # needs the API running (see ../api)
pnpm build
```
