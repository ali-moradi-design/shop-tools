# shop-tools

A demo tool shop for a portfolio. Every category has its own technical specifications:
filter by ranges in the unit you prefer (Nm or in·lb, mm or inches), compare up to four
products side by side, and see the stock of each warehouse. Express 5 API on MySQL (Prisma),
Next.js storefront rendered on the server per request.

Scope and decisions: [docs/brief.md](docs/brief.md). Progress: [docs/build-log.md](docs/build-log.md).
Security review: [docs/security.md](docs/security.md).

## Run locally

Needs Node 22, pnpm 10 and Docker.

```bash
pnpm install
docker compose up -d                      # MySQL on 127.0.0.1:3306
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @st/api migrate             # create the tables
pnpm --filter @st/api seed                # 500 tools, specs, warehouses, accounts, reviews
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
pnpm --filter @st/web build                # no API needed: pages are rendered per request
pnpm --filter @st/web e2e                  # against the running API + web build
```

CI (`.github/workflows/ci.yml`) runs the API checks, the web checks and the E2E
suite against a real MySQL; the `ci` job is the single required check.

## Production notes

- The browser reaches the API through the storefront's `/api/*` proxy route, which
  passes the visitor's IP on; set `TRUST_PROXY=1` on the API so rate limits count
  visitors, and keep the API port private.
- Production refuses weak JWT secrets and a wildcard CORS origin, and the seed
  needs `ADMIN_PASSWORD`. See [deploy/](deploy) and [docs/security.md](docs/security.md).
- Nightly reset: run `reset-demo:prod` from cron; the storefront renders on every
  request, so it shows the restored data at once.

Product names and photos come from the public dewalt.ae catalogue and belong to their
owners; they are used only as sample content for this non-commercial demo (prices, stock and
specifications are generated and the payment gateway is simulated). The seed lives in
`apps/api/src/scripts/seed/catalog/`.
