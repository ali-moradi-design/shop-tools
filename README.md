# shop-tools

Work in progress: the tools shop (technical specs, spec filters, compare, stock
per warehouse) for a portfolio. It starts from a plain copy of `leather-shop`
(no history); the database is moving to MySQL and the storefront to SSR.
Until those steps are merged, the code below still describes the copied state
(Express + MongoDB API, Next.js with PPR).

Scope and decisions: [docs/brief.md](docs/brief.md). Progress: [docs/build-log.md](docs/build-log.md).
Security review inherited from the copy: [docs/security.md](docs/security.md).

## Run locally

Needs Node 22, pnpm 10 and Docker.

```bash
pnpm install
docker compose up -d                      # MongoDB on 127.0.0.1:27017
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @st/api seed                # 480 products, demo accounts, reviews
pnpm dev:api                              # http://localhost:4000 (docs: /api/docs)
pnpm dev:web                              # http://localhost:3000
```

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@shop-tools.local` | `Demo123!` |
| Admin | `admin@shop-tools.local` | `Admin123!` (development only; production reads `ADMIN_PASSWORD`) |

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test   # all workspaces
pnpm --filter @st/web build                # prerendering reads the API, so run the API first
pnpm --filter @st/web e2e                  # against the running API + web build
```

CI (`.github/workflows/ci.yml`) runs the API checks, the web checks and the E2E
suite against a real MongoDB; the `ci` job is the single required check.

## Production notes

- The browser reaches the API through the storefront's `/api/*` proxy route, which
  passes the visitor's IP on; set `TRUST_PROXY=1` on the API so rate limits count
  visitors, and keep the API port private.
- Production refuses weak JWT secrets and a wildcard CORS origin, and the seed
  needs `ADMIN_PASSWORD`. See [deploy/](deploy) and [docs/security.md](docs/security.md).
- Nightly reset: run `reset-demo:prod` from cron with `WEB_REVALIDATE_URL` and
  `REVALIDATE_SECRET` set, so the storefront drops its cached catalog afterwards.

Product names, photos and prices come from the public thursdayboots.com catalog and
are used only as sample content for this non-commercial demo.
