# Build log

What was done in each session, in order. Updated at the end of every step.

## Session 1 (2026-10-21): prerequisites, brief, plan

- Prerequisites checked (git, node 22, pnpm 10, docker, Playwright, GitHub access).
- `docs/brief.md` copied from the roadmap repo (update section, common part, Tools
  section, Tools build plan) with the four overriding decisions on top:
  English only, plain copy of `leather-shop`, MySQL, SSR.
- `leather-shop` and the data layer of `nodejs-bookshop-ddd-mysql` read; a PR plan
  was written and is waiting for approval. No application code yet.
- Next: approval of the plan, then mockups (images rendered with Playwright), then code.

## Step 1: plain copy of leather-shop

- Copied `leather-shop` `origin/main` (6055bd0) without history. Not copied: the
  thursdayboots.com catalog (`products.json`), the 13 leather photos in
  `apps/web/public/media` and `docs/mockups`.
- Replaced them with a 24-product placeholder seed and grey placeholder images so
  tests and the demo run until the tools catalog exists (step 12).
- Renamed packages `@wg/*` → `@st/*`, `welt-and-grain` → `shop-tools`, and the
  seed e-mail domain to `shop-tools.local`. Brand text in the web UI is still the
  copied one; it is replaced by the new design.
- Still MongoDB + PPR. Checked locally: API lint, build and 42 tests; web lint,
  typecheck and 5 tests.
- Added `CLAUDE.md` with the graphify rule: query the code graph first
  (`graphify query`, AST only, no LLM tokens) instead of reading many files.
- Product photos for the tools catalog will come from free sources (Wikimedia
  Commons, CC0 / CC BY / CC BY-SA / public domain), with a `CREDITS.md`.

## Step M: mockups (waiting for approval)

- Five pages rendered to images with Playwright from HTML/CSS (`docs/mockups/build.mjs`,
  sources in `docs/mockups/src`): home, product listing with spec filters, product
  page, cart, compare (up to four products).
- Working name for the shop: **Toolbench Supply Co.** (placeholder, to be confirmed).
- Look: sharp and industrial. Concrete grey background, near-black ink, safety
  yellow accent, no rounded corners, hairline borders. Barlow Condensed (headings),
  IBM Plex Sans (text), IBM Plex Mono (specs and numbers).
- Spec filters: price and spec sliders with min/max fields and a unit switch
  (Nm / in·lb, mm / in, kg / lb), checkbox groups with counts, active filter chips.
- Stock per warehouse is shown on the product page, in the cart (which warehouse
  ships each line) and in the compare table.
- Photos: Wikimedia Commons (CC0, CC BY, CC BY-SA, public domain), credits in
  `docs/mockups/src/photos/CREDITS.md`.
- No UI code until these are approved.

## Step M2: demo photos from dewalt.ae, mockups on real photos

- Decision (2026-10-21, by the owner): the shop uses product photos from
  www.dewalt.ae as demo content. The code and the site are a non-commercial demo
  and the payment gateway is simulated. The photos stay the property of their
  owners; `apps/web/public/catalog/README.md` says so and explains how to remove them.
- 500 photos (the main white-background photo of the first 500 product pages;
  `robots.txt` allowed it; ~4 requests at a time with a delay), downscaled to
  900 px WebP: `apps/web/public/catalog/<sku>.webp` (10.6 MB) with `manifest.json`
  (product name, page URL, source image URL).
- Mockups re-rendered on these photos; the Wikimedia photos and their credits were
  removed. `docs/mockups/build.mjs` reads the photos from the catalog folder
  (`OUT_DIR` can redirect the output).
- Note for the seed (step 12): the generated products pick their photo from the
  manifest by category; names, specs and prices stay generated.

## Step 2: MySQL foundation

- Plan change (explained): the copied Mongo models use `ObjectId` references, so
  moving module by module would need throw-away changes on the Mongo side. The
  switch is therefore two PRs: this foundation, then one PR that moves every
  repository (contract tests are the oracle) and removes MongoDB.
- Prisma 6.19.3 (same line as `nodejs-bookshop-ddd-mysql`), MySQL 8.4.
- `apps/api/prisma/schema.prisma`: the full relational model with the current
  (leather) product fields so the API contract stays identical for now.
  Money is `Int` in minor units (the reference repo used `Float`, not copied).
  String arrays (images, tags, features) are JSON columns.
  Cart, order and order lines are tables; the order status history is a table.
- Migration `init` applied. Collation `utf8mb4_unicode_ci` (case-insensitive,
  so `LIKE` search and e-mail uniqueness ignore case).
- `src/shared/infra/prisma/client.ts`: one client plus `getPrisma()` which
  returns the transaction client while a unit of work is running
  (`AsyncLocalStorage`); `PrismaUnitOfWork` for `IUnitOfWork`.
- Tests: `tests/global-setup.ts` drops/creates `toolbench_test` and runs
  `prisma migrate deploy` once per run (name must end with `_test`); a new
  integration test checks the tables and a commit / rollback.
- `compose.yaml`: MySQL (small buffer pool, `performance_schema` off, 512 MB) next
  to the old MongoDB. CI: MySQL service in the API job. Dockerfile copies the
  Prisma schema before install (the client is generated in `postinstall`).

## Step 3: all repositories on MySQL, MongoDB removed

- Every module's `infra` was rewritten on Prisma (identity, catalog, promotions,
  ordering, engagement, reviews, reporting). The domain, application and HTTP
  layers did not change, except where a Mongo-shaped value leaked through a port
  (see "Ports changed").
- The 44 contract tests that passed on MongoDB pass unchanged on MySQL; 7 new tests
  cover MySQL-specific behavior: `LIKE` escaping, SQL text in a search, two parallel
  buyers for the last unit, an all-or-nothing payment, duplicate e-mail (409) and
  the guest cart cleanup. The Playwright E2E (purchase path + axe) passes too.
- Stock: `UPDATE ProductVariant ... WHERE stock >= n` is one atomic statement;
  `Product.stock` is recomputed from the variants in the same transaction.
- Payment is now atomic: stock decrements and the paid order are one transaction
  (`PayOrderUseCase`). The old hand-written "give the stock back" compensation only
  runs when there is no unit of work (unit tests with fakes); with a real
  transaction it would have added the stock twice.
- Ports changed: `aggregate*` took a Mongo `$match` object; they now take a typed
  `OrderStatsFilter`. `ICartRepository.purgeStaleGuestCarts` replaces the MongoDB
  TTL index (the server runs it at start and daily).
- Bug found by the real database: `validate()` did `Object.assign(req.query, parsed)`,
  but in Express 5 `req.query` is a getter that parses the URL on every read, so the
  parsed (typed, defaulted) values were thrown away and controllers got raw strings.
  Mongoose had silently cast them. `validate()` now replaces `req.query`; a test
  covers it. This also means query values are now really validated (`limit=1000` -> 400).
- Error handler maps Prisma `P2002` (duplicate) to 409, `P2025` to 404, `P2003` to 409.
- Removed: `mongoose`, `mongodb-memory-server`, Mongo in compose, CI, deploy files.
  Deploy: MySQL container (internal network, 128 MB buffer pool, `performance_schema`
  off, 512 MB), the API runs `prisma migrate deploy` on start. CI builds the API
  image (Docker could not apt-get inside this sandbox, so the image is verified in CI).

## Step 4: PPR to SSR

- `cacheComponents` off; every page is `force-dynamic`; `'use cache'`, `cacheLife`,
  `cacheTag`, `generateStaticParams`, the `/hooks/revalidate` route, the admin
  `refreshCatalog` action and the reset script's revalidate call are gone. The editor
  now just calls `router.refresh()`. `next build` lists only dynamic (`ƒ`) routes and
  works with the API stopped. Why SSR: `docs/ssr.md`.
- CSP moved to `src/proxy.ts` with a per-request nonce: scripts no longer need
  `'unsafe-inline'` (an accepted risk in `docs/security.md` is removed). Unit tests for
  the policy; E2E tests for the nonce, the cache headers and price freshness (9/9).
- Web image no longer needs the API at build time.

## Steps 5–7: tools domain on the API

- Schema: `Category`, `SpecDefinition` (kind `number|text`, unit family, `filterable`, `better`
  = which direction wins in a comparison), `ProductSpec` (EAV; `valueNum` is indexed for
  ranges, `valueText` for words), `ProductVariant` (sku, label, optional own price),
  `Warehouse`, `StockLevel` (PK warehouse + variant), `OrderItemAllocation`.
  `Product.stock` stays as a denormalized total and is re-synced after every stock change.
- Units (`catalog/domain/units.ts`): numbers are stored in a base unit; every unit family
  has factors (Nm, in·lb, ft·lb …). A filter such as `spec.torque=400..900in·lb` is converted
  to base units in `parseSpecFilters` before it touches SQL. Unknown keys or units are a 400.
- Endpoints: `GET /categories`, `GET /categories/:slug`, `GET /warehouses`,
  `GET /products?category=…&spec.<key>=…&warehouse=…&instock=1`,
  `GET /products/facets` (ranges, options and counts for the sidebar),
  `GET /products/compare?slugs=a,b` (2–4 products of one category; each row has `best[]`).
- Stock per warehouse: paying an order takes units warehouse by warehouse in dispatch order
  (BER, HAM, MUC) with `SELECT … FOR UPDATE`, inside one transaction together with the
  payment, and stores where every unit came from (`OrderItemAllocation`).
- Seed: 500 products generated from the DEWALT catalogue (`scripts/seed/catalog/*`):
  classification into 11 categories, specs parsed from the product names where possible and
  generated otherwise, three warehouses with random but reproducible stock.
- A real bug found on the way: Express 5 made `req.query` a getter, so the validator's
  `Object.assign(req.query, …)` silently lost every parsed value. `validate()` now redefines
  the property; there is a test for it.

## Steps 8–10: storefront

- New design (`docs/mockups`): yellow/black "workshop" look, Barlow Condensed + IBM Plex.
  FSD kept: `entities/category`, `features/catalog-filters` (sidebar with dual range sliders and
  a unit switch, active filter chips, sort), `features/compare` (tray, toggle, table),
  `widgets/home`, `widgets/product-detail`. All filter state lives in the URL.
- Product page shows a spec table and the stock of every warehouse; the buy box picks a variant.
  The order page shows which warehouse each line shipped from. The admin editor has a stock
  input per warehouse and variant.
- A hand-edited URL that the API refuses (`spec.torque=abc`) shows "These filters are not
  valid" instead of an error page.

## Step 11: E2E and two SSR problems they found

- E2E: purchase (with warehouse display), spec filters with units, compare (best values,
  max 4, different categories refused), invalid filter URL, accessibility (axe) for home,
  category, product, login, help, compare; plus the SSR specs (15 tests).
- **SSR and rate limits:** the storefront calls the API from its own address, so all visitors
  shared one 300-request budget. Fix: server-side fetches forward the visitor IP
  (`shared/api/visitor-ip.ts`), and the limit is now `RATE_LIMIT_MAX` (default 1000 per 15
  minutes); CI lifts it for the E2E run.
- **Client bundle:** a client component imported the `entities/product` barrel, which now pulls
  in a server-only module; it imports the two files it needs instead.
- Contrast: muted text darkened (`#565e66`) to pass WCAG AA on the grey background.
- The CSP E2E checks the HTML the server sent (every `<script>` carries the nonce) instead of
  the live DOM, because scripts injected later by the loader get their nonce as a property.

## Tooling: pnpm 12 and Node 24

- pnpm 10.28.0 → 12.15.0. `onlyBuiltDependencies` became `allowBuilds` (pnpm 11+ fails the
  install on an unapproved build script); `@scarf/scarf` and `unrs-resolver`, which were already
  skipped, are now denied explicitly.
- Dockerfiles install pnpm with `npm install -g` because the corepack bundled with Node cannot
  run pnpm 12. CI uses `pnpm/action-setup@v6`.
- Node 22 → 24 (current LTS) in CI, Dockerfiles and `engines`; `@types/node` aligned to 24.

## Local Docker and root scripts

- The root `compose.yaml` was not valid YAML (leftover MongoDB lines from the leather-shop
  copy). It now holds MySQL on `127.0.0.1:33100` (so it never clashes with a MySQL on 3306)
  and, like leather-shop, the whole stack: MySQL → `seed` (migrations + demo data) → API → web.
  `docker compose up -d --build` runs everything; `pnpm db:up` / `pnpm db:down` only MySQL.
- Root scripts: `db:up`, `db:down`, `migrate`, `seed`, and `dev`, which starts API and web
  together. `.env.example` and the API test defaults point at port 33100.
- API image fix: `pnpm deploy` reinstalls the packages without the generated Prisma client, so
  the container failed on start ("@prisma/client did not initialize yet"). The runtime stage
  now runs `prisma generate` (after OpenSSL is installed, so the engine matches).
- README: features, both ways to run locally, a scripts table.

## Production deploy files

- `.github/workflows/docker.yml`: after CI passes on `main`, builds and pushes
  `shop-tools-api:<sha>` and `shop-tools-web:<sha>` to ghcr.io, then deploys through deploy-kit
  v1.0.0 (`deploy-app.yml`, `secrets: inherit`, smoke `/ /robots.txt /api/health`).
- `deploy/compose.yaml`: `IMAGE_TAG` (set by the server's `deploy-app`) instead of `TAG`; each
  service gets only the variables it needs (no `env_file`), and missing secrets stop
  `docker compose` with a clear message. Migrations run with `node_modules/.bin/prisma` (npx
  may write a cache on the read-only disk), `CHECKPOINT_DISABLE=1`. The MySQL healthcheck reads
  the password inside the container. Web: read-only with tmpfs for `/tmp` and
  `.next/cache` (next/image writes its optimized images there), waits for a healthy API.
- Web image: `HEALTHCHECK` on `/robots.txt`; `compress: false` (Nginx gzips).
- `deploy/nginx.conf`: IPv6 listen, `server_tokens off`, dotfiles denied, upgrade headers.
- CI: actions pinned to full SHAs, `persist-credentials: false`; `.github/dependabot.yml`
  keeps the pins current.
- Tested locally with the production compose file: all three containers healthy, migrations,
  seed and reset from `dist`, `/`, `/admin`, `/search`, `/api/health` and next/image answer 200.
  Memory: web 71 MiB, api 40 MiB, MySQL 224 MiB.
