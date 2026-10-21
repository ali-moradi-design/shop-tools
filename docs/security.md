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
| 6 | Medium | No security headers on the storefront | CSP (self + product CDN; `frame-ancestors 'none'`), `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production; `X-Powered-By` off |
| 7 | Medium | Production accepted weak or example JWT secrets and a wildcard CORS origin | The API refuses to start in production with secrets under 32 characters, example values, equal access/refresh secrets, or `CORS_ORIGIN=*` |
| 8 | Medium | All browser calls reach the API through the storefront, so the rate limiter saw one IP for every visitor | `/api` is now a runtime proxy route that forwards the visitor IP; API `TRUST_PROXY=1`; Nginx always overwrites `X-Real-IP` |
| 9 | Low | API Dockerfile was broken by the book→product rename (`node:20-productworm-slim`) and ran as root | New multi-stage pnpm Dockerfiles for API and web, running as `node`, with a healthcheck; tested locally |
| 10 | Low | Cart documents could grow without limit | At most 50 different lines per cart |
| 11 | Low | The shared demo customer can see orders other visitors placed with it | Checkout warns not to enter real data; the nightly reset deletes all orders |
| 12 | Low | Public review list exposed reviewers' emails | Fixed earlier (PR #9): name only |

Deploy hardening in `deploy/compose.yaml`: MongoDB with auth, no published port and
an internal network; API on the internal network only, read-only filesystem,
`no-new-privileges`; only the web port is published, on `127.0.0.1`.

## Checked and fine

- Passwords hashed with bcrypt; refresh tokens stored hashed and rotated; generic
  "Invalid credentials" on login; auth endpoints rate-limited.
- All request bodies, params and queries validated with zod; search terms are
  length-limited, and `%`, `_` and `\` are escaped before the SQL `LIKE`; all SQL goes through Prisma (parameterized) or tagged `$queryRaw` templates; page size ≤ 100.
- Prices and stock always come from the catalog at checkout and payment; stock is
  taken atomically per size; order access is checked per user.
- Cookies are httpOnly, `Secure` in production, SameSite=Lax; the guest cart id is
  a random UUID.
- The admin area is checked on the server (role) and every admin call is checked
  again by the API (permissions); the cache-refresh server action checks the role.
- The revalidate hook needs a secret (constant-time compare).
- JSON-LD is escaped; React escapes all user text (reviews, names).
- `next/image` only optimizes images from the product CDN path.
- No secrets in the repository (`.env` files are ignored).

## Accepted

- `braces` (high, ReDoS) through `tsc-alias` → `chokidar`: build-time tool only, no
  patched version exists, not in the runtime image.
- Script CSP keeps `'unsafe-inline'`: nonces would turn every prerendered (PPR)
  page dynamic. All other sources are restricted.
- Swagger UI stays public at `/api/docs` — it documents a public demo API.
- GitHub Actions are pinned to major tags, not commit SHAs.
