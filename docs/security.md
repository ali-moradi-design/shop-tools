# Security review (2026-10-21)

Review of the API, the storefront, CI and the deploy files before the first
deployment. Every finding below is fixed unless marked as accepted.

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 1 | Critical | `next@16.3.5` had known advisories (RCE in `next/og`, SSRF in the image optimizer, cache poisoning) | Upgraded to `16.3.8`; `pnpm audit --prod` is clean |
| 2 | High | The seed created the admin with a password published in the README (`Admin123!`) — anyone could edit prices and orders on the live demo | Admin email/password come from `ADMIN_EMAIL` / `ADMIN_PASSWORD`; seeding in production fails without a 12+ character password. Reviewer accounts get random passwords |
| 3 | High | Uploads kept the client's file extension and trusted the client's MIME type, so an admin token could store an `.html`/`.svg` file served from the API origin (stored XSS) | File name and extension come from the checked type; the first bytes must match a real JPEG/PNG/WebP/GIF; `/uploads` is served with `nosniff`, a `sandbox` CSP and no directory index |
| 4 | Medium | CSRF: SameSite=Lax cookies are still sent from sibling subdomains of `ali-moradi-develop.com` (same site) | `originCheck` middleware: cookie-authenticated writes must come from an allowed origin (Origin, else Referer) |
| 5 | Medium | Open redirect on sign-in: `next=/\evil.com` passed the `//` check | `safeNext` rejects backslashes and anything that resolves to another origin (unit tested) |
| 6 | Medium | No security headers on the storefront | CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production; `X-Powered-By` off. Since the SSR step the CSP carries a per-request script nonce (no `'unsafe-inline'` for scripts) |
| 7 | Medium | Production accepted weak or example JWT secrets and a wildcard CORS origin | The API refuses to start in production with secrets under 32 characters, example values, equal access/refresh secrets, or `CORS_ORIGIN=*` |
| 8 | Medium | All browser calls reach the API through the storefront, so the rate limiter saw one IP for every visitor | `/api` is now a runtime proxy route that forwards the visitor IP; API `TRUST_PROXY=1`; Nginx always overwrites `X-Real-IP` |
| 9 | Low | API Dockerfile was broken by the book→product rename (`node:20-productworm-slim`) and ran as root | New multi-stage pnpm Dockerfiles for API and web, running as `node`, with a healthcheck; tested locally |
| 10 | Low | Cart documents could grow without limit | At most 50 different lines per cart |
| 11 | Low | The shared demo customer can see orders other visitors placed with it | Checkout warns not to enter real data; the nightly reset deletes all orders |
| 12 | Low | Public review list exposed reviewers' emails | Fixed earlier (PR #9): name only |

## Security test of the tools shop (2026-10-21)

Run after the MySQL, SSR and tools-catalog work. Method: dependency audit, response-header
check, an active probe of the running API (anonymous and customer access to admin routes,
mass assignment, IDOR, SQL injection through every new query parameter, prototype pollution,
oversized and malformed bodies, brute force, CSRF), and a concurrency test on the real
database. The automated part is kept as regression tests in
`apps/api/tests/integration/security.test.ts` (55 tests) and `apps/web/e2e` (invalid filter URL).

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| 13 | Medium | Server-side renders called the API from the storefront's own address, so all visitors shared one rate-limit budget (300 requests per 15 minutes): a few visitors could lock everyone out of the catalog | Server-side fetches forward the visitor IP (`shared/api/visitor-ip.ts`); the limit is `RATE_LIMIT_MAX` (default 1000); the E2E run lifts it |
| 14 | Low | Invalid JSON and bodies over 1 MB returned `500 Internal server error` (and logged an error each time) | The error handler answers Express's own 4xx errors with 400 / 413 and a generic message |
| 15 | Medium | Express 5 made `req.query` read-only: `validate()` silently dropped the parsed query, so validated defaults and limits were not applied | `validate()` redefines the property; regression test |
| 16 | Low | A hand-edited URL the API refuses (`spec.torque=abc`) crashed the category page with an error | The grid shows "These filters are not valid" with a clear link |

Checked and fine (all covered by tests): anonymous and customer calls to admin routes get 401/403;
registration cannot pick a role; one customer cannot read or pay another's order; client prices
and totals are ignored; quantities below 1, fractional or huge are refused; spec filters, search
and sort accept only a strict grammar (unknown keys, units, duplicates, more than 20 filters,
values over 100 characters and `__proto__` keys are a 400), and values are bound parameters; the
tables are intact after the injection attempts; login brute force gets 429; the foreign-origin
check blocks cookie writes; error bodies carry no stack traces; compare takes 2–4 slugs only.
**Concurrency:** 8 customers paying at once for the last 2 units (in two warehouses): exactly 2
payments succeed, 6 get `409`, no stock level goes negative, and exactly 2 allocations are stored.

Accepted: `deepmerge-ts` (high, stack exhaustion) is reached only through the Prisma CLI's own
config loader (`prisma migrate deploy` at start-up); it never sees user input and no patched
version is available for the pinned Prisma line. Re-check when Prisma is upgraded.

Deploy hardening in `deploy/compose.yaml`: MySQL with its own user and password, no published port and
an internal network; API on the internal network only, read-only filesystem,
`no-new-privileges`; only the web port is published, on `127.0.0.1`.

## Checked and fine

- Passwords hashed with bcrypt; refresh tokens stored hashed and rotated; generic
  "Invalid credentials" on login; auth endpoints rate-limited.
- All request bodies, params and queries validated with zod; search terms are
  length-limited, and `%`, `_` and `\` are escaped before the SQL `LIKE`; all SQL goes through Prisma (parameterized) or tagged `$queryRaw` templates; page size ≤ 100.
- Prices and stock always come from the catalog at checkout and payment; stock is
  taken per warehouse inside one transaction with row locks (`SELECT … FOR UPDATE`); order access is checked per user.
- Cookies are httpOnly, `Secure` in production, SameSite=Lax; the guest cart id is
  a random UUID.
- The admin area is checked on the server (role) and every admin call is checked
  again by the API (permissions).
- JSON-LD is escaped; React escapes all user text (reviews, names).
- `next/image` only optimizes images from the product CDN path.
- No secrets in the repository (`.env` files are ignored).

## Accepted

- `braces` (high, ReDoS) through `tsc-alias` → `chokidar`: build-time tool only, no
  patched version exists, not in the runtime image.
- Swagger UI stays public at `/api/docs` — it documents a public demo API.
- GitHub Actions are pinned to major tags, not commit SHAs.
