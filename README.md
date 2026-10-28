# shop-tools

A demo tool shop for a portfolio. Every category has its own technical specifications:
filter by ranges in the unit you prefer (Nm or in·lb, mm or inches), compare up to four
products side by side, and see the stock of each warehouse. Express 5 API on MySQL (Prisma),
Next.js storefront rendered on the server per request.

Scope and decisions: [docs/brief.md](docs/brief.md). Progress: [docs/build-log.md](docs/build-log.md).
Security review: [docs/security.md](docs/security.md).

## Features

- Catalog of 500 tools in categories, each with its own technical specifications
- Spec filters by range in the unit you prefer (Nm or in·lb, mm or inches); filter
  state lives in the URL
- Compare up to four products side by side, with the best value in each row marked
- Product pages with a spec table and the stock of every warehouse; orders show which
  warehouse each line shipped from
- Cart, checkout with discount codes (`WELCOME10`, `FLAT20`) and a simulated payment
  gateway (approve `4242 4242 4242 4242`, decline `4000 0000 0000 0002`)
- Accounts with order history, favorites, reviews
- Small admin: orders, products, price and stock per warehouse and variant
- Server-side rendering per request with a per-request CSP nonce; SEO metadata,
  JSON-LD, sitemap, robots, Open Graph image
- Nightly demo reset (`pnpm --filter @st/api reset-demo`)

## Run locally

### Everything in Docker

Needs only Docker.

```bash
docker compose up -d --build              # MySQL, API and storefront
```

The schema and the demo data load on every start. Open http://localhost:3000 once
`up` returns; the API docs are at http://localhost:4000/api/docs.
`docker compose down` stops everything (add `-v` to also delete the data).

### With pnpm (hot reload)

Needs Node 24, pnpm 12 and Docker.

```bash
pnpm install
pnpm db:up                                # MySQL in Docker on 127.0.0.1:33100 (stop: pnpm db:down)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm migrate                              # create the tables
pnpm seed                                 # 500 tools, specs, warehouses, accounts, reviews
pnpm dev                                  # API on :4000 (docs: /api/docs) + web on :3000
```

To run one side only: `pnpm dev:api` or `pnpm dev:web`.

Demo accounts:

| Role | Email | Password |
| --- | --- | --- |
| Customer | `demo@shop-tools.local` | `Demo123!` |
| Admin | `admin@shop-tools.local` | `Admin123!` (development only; production reads `ADMIN_PASSWORD`) |

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm db:up` / `pnpm db:down` | start / stop MySQL in Docker (`127.0.0.1:33100`) |
| `pnpm migrate` | apply the Prisma migrations |
| `pnpm seed` | load the demo catalog and accounts (upserts, safe to repeat) |
| `pnpm dev` | API and storefront together, with hot reload |
| `pnpm dev:api` / `pnpm dev:web` | one side only |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` | checks for all workspaces |

## Checks

```bash
pnpm lint && pnpm typecheck && pnpm test   # all workspaces
pnpm --filter @st/web build                # no API needed: pages are rendered per request
pnpm --filter @st/web e2e                  # against the running API + web build
```

API tests rebuild a `toolbench_test` database on the Docker MySQL from `pnpm db:up`
(set `TEST_DATABASE_URL` to use another server).

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
