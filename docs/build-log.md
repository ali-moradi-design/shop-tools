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
- Fonts are local: `next/font/google` downloaded the fonts during `next build`, and one CI run
  failed when that download broke. The nine Latin woff2 files (Barlow Condensed 500-700,
  IBM Plex Sans and Mono 400-600, from Fontsource 5, SIL OFL with the license files) now live in
  `apps/web/src/app/fonts` and load through `next/font/local`. The build works without network.

## Header and hero in the page container

- On wide screens the header rows and the home hero ran edge to edge while the sections below
  sat in the 1440px `container-page`, so the logo, search and headline did not line up with the
  rest of the page. The bands (black utility bar, borders, white hero) still span the full
  width; their content now sits in `container-page`. The hero image keeps its frame with a left
  and right border; on mobile it stays full width.
- Checked at 2400, 1280 and 390px: no horizontal scroll.
- CI: `ubuntu-latest` moved to 26.04, where Playwright 1.56 cannot install Chromium, so the E2E
  job failed before any test ran. The E2E job is pinned to `ubuntu-24.04` until Playwright is
  upgraded.

## Header fixes on every screen size

- Category bar: inside the 1440px container the 11 categories (about 2000px) were cut off on
  wide screens. Below `xl` it is one scrolling row as before; from `xl` it is a six-column
  grid, so every category shows in two tidy rows.
- Hero: removed the two vertical lines around the image.
- Mobile header: the search box was squeezed to nothing and the account icon sat on top of it.
  Search now gets its own row below the logo and icons; the logo drops its tagline and shrinks
  a little below `sm`; the utility bar shows only "FREE SHIPPING OVER $150".
- Tablet: the "Account" and "Compare" labels show from `lg` (icons below), the utility bar
  hides the demo notice below `lg`, and the logo tagline no longer wraps.
- Checked at 320, 375, 768, 1024, 1280, 1440, 1920 and 2560px: no horizontal page scroll,
  nothing overlaps.

## Playwright 1.65

- `@playwright/test` 1.56.1 → 1.65.0 (`@axe-core/playwright` 4.14 works with it unchanged).
  1.65 supports Ubuntu 26.04, so the E2E job is back on `ubuntu-latest` and the
  `ubuntu-24.04` pin is gone.
- All 15 E2E tests pass locally against the production build.

## Port plan

- `docs/port-plan.md`: the features built for leather-shop and shop-books (admin panel, product
  page, Stripe Checkout with a simulator, email outbox, accounts, returns, catalog extras,
  admin tools, A/B testing, About/Help, no search indexing, review lessons), phase by phase,
  with the source PRs and files, to be carried out in a later session.

## Port phase 1a: admin shell, product list, trash

First part of `docs/port-plan.md` phase 1 (admin panel), ported from leather-shop. Decisions for
the whole port (asked before starting): new screens use the shop's current look without new
mockups; every phase is merged on its own; Stripe simulator on, emails only in the admin outbox,
Sentry and analytics off.

- API: `GET /products/trash` (deleted products, newest first) and `POST /products/:id/restore`,
  both staff-only (`products:delete`); `maxStock` on `GET /products` for the low-stock filter;
  `PATCH /products/:id` accepts `compareAtPrice: null` to end a sale. 4 new integration tests.
- Admin shell: side menu on desktop (yellow bar marks the section), a scrolling strip on phones,
  page titles in the layout's place, a loading skeleton. Each page starts its API reads before
  the admin check (`early()`), so they run in parallel.
- Products: search, category and stock filters (5 or fewer / sold out) and sortable headers, all
  in the URL; stock per warehouse in each row; multi-select with bulk feature/unfeature, percent
  sale, end sale and move to trash. A bulk sale changes the base price only: options with their
  own price (kits, body only) keep it. TanStack Table 9 as in leather-shop.
- Writes are Server Actions (`features/admin/api/actions.ts`) that call the API with the
  visitor's cookies; the API checks the permission. Pages are SSR, so `refresh()` is enough (no
  cache tags). `serverMutate` added next to `serverApi`.
- Trash page with restore.
- Found on the way: an `sr-only` header label (absolutely positioned) escaped the table's
  scroll box and widened the page on phones; the scroll boxes are now `relative`. Success
  messages use ink instead of green (green failed contrast on the grey background).
- E2E: filter, sort, bulk feature, axe, delete → trash → restore. Checked at 320, 390, 768, 1024
  and 1440px: no horizontal page scroll.

## Port phase 1b: product form

- One form for creating and editing a product (`features/admin/ui/ProductForm.tsx`), built with
  react-hook-form and a zod schema that the Server Action runs again (`model/product-form.ts`).
  Sections: basics (name, brand, model, category, URL name), description and features,
  specifications of the chosen category (numbers in the unit shown), price and sale price,
  photos, and options with an own price and stock per warehouse.
- Empty URL name and SKUs are derived from the model and name. Number specs are checked against
  the category's definitions on the server, so a typo becomes a field error, not a 400.
- Photos upload straight to the API (through the `/api` proxy, so no Server Action body limit)
  and are served by a new `/uploads/products/<file>` route on the web origin (only that folder,
  only image file names), so the CSP and next/image keep working. Arrows change the order; the
  first photo is the cover.
- The save bar stays at the bottom of the screen with "Unsaved changes". A new product opens its
  edit page with "Product created". The old price/stock editor is gone.
- The `@/shared/api` barrel is not imported from client code (it pulls in a server-only module).
- Tests: 6 unit tests for the form model; E2E creates a product with a photo and two options,
  puts it on sale, checks the shop page shows the uploaded photo, then trashes it (with axe).

## Port phase 1c: orders, discounts, customers, reviews

- API: `GET /orders` is paged and takes `status` and `q` (the shown order number, the ship-to
  name or the customer's e-mail; LIKE wildcards are escaped). Customers still see only their own
  orders. New indexes `Order(status, createdAt)` and `Order(createdAt)` for the admin list
  (migration `order_list_indexes`, SQL from `prisma migrate diff`). Staff can no longer block
  themselves or change their own roles (400), as in leather-shop.
- Orders: status tabs and search (both kept in the URL), a quick status select per row, and an
  order page with items (and the warehouses they shipped from), customer, address, payment, a
  status form with a note for the history, and the history itself.
- Discounts: create (percent or amount, minimum order, max uses, end date), pause/activate,
  delete; the state (Active, Paused, Expired, Used up) is decided on the server.
- Customers: search, sort and pages in the browser (the list is short), block/unblock and
  make/remove admin; your own row shows "You" instead of actions.
- Reviews: newest first, remove (the API recalculates the product rating).
- The side menu now lists Discounts, Customers and Reviews.
- Tests: 5 API tests (paging, status filter, search by number/name/e-mail, wildcards, customers
  see only their own, note in history, self-lockout, blocked sign-in); E2E walks the four
  sections with axe on each page.

## Port phase 1d: dashboard and review lessons

- Dashboard: revenue, paid orders and average order for the last 30 days, customers and low
  stock; a revenue-per-day column chart (hidden table with the same numbers for screen readers);
  paid orders by status and best sellers as bar lists; latest orders and running low. All eight
  reads start together, next to the admin check. Sales by category and returning customers come
  with the insights in phase 7.
- The chart from leather-shop had focusable `<rect>`s with an `aria-label` and no role (axe:
  `aria-prohibited-attr`); the hover targets are now mouse-only and the hidden table serves
  keyboard and screen-reader users.
- Review lessons from leather-shop #33–#35: the cart context is split into state and actions,
  so the buy box, sign-in and checkout (which only add or refresh) no longer re-render on every
  cart change; `priority` on images became `preload` (deprecated in Next 16). Admin table row
  links already use `prefetch={false}`, admin pages read in parallel, and the order list and
  stock sort have indexes.
- E2E: the dashboard is covered with axe. Streamed parts are briefly held in a hidden copy at the
  end of `<body>` before React shows them, so these checks look inside `<main>`.

## Port phase 2: product page

- Gallery from leather-shop: a scroll-snap strip (swipe on phones, arrows and thumbnails on
  desktop), and a full-screen view in a native `<dialog>` with zoom where you click. Only the first
  photo loads up front. With one photo (most demo products) it takes the full width; the leather
  layout kept an empty 72px thumbnail column.
- Rating summary: new `GET /reviews/summary?product=` (average, count, reviews per star) and a bar
  per star above the reviews. The summary and the review list are read in parallel; before, the
  list read the product first and then the reviews.
- Sale price shows the saving and the percent; the photo badge shows the percent.
- "Only N left" under the stock table when the chosen option has 3 or fewer units.
- Phones: once the add-to-cart button scrolls out of view, a bar with the name, price and an
  add-to-cart button sticks to the bottom (IntersectionObserver, as in leather-shop).
- "More <category>": up to 8 other in-stock tools of the category, best rated first.
- Recently viewed: kept in the visitor's browser only (`localStorage`, read through
  `useSyncExternalStore`, so the server render and the first client render match).
- Share: the native share sheet on phones, otherwise copies the link.
- Tests: API test for the per-star counts; E2E for zoom, summary, related, share, recently
  viewed (with axe) and the phone sticky bar.

## Port phase 3: Stripe Checkout with a local simulator

- Replaces the `fake` payment. The API has a `PaymentGateway` port: `StripeGateway` (test keys
  only; the API refuses to start with a key that is not `sk_test_…`) and, when
  `STRIPE_SECRET_KEY` is unset, `MockStripeGateway` + `MockCheckout`. The simulator signs a real
  `checkout.session.completed` event with the Stripe SDK and POSTs it to the shop's own webhook
  (`http://127.0.0.1:$PORT/...`), so the confirm path is the same as with Stripe.
- Webhook `POST /payments/stripe/webhook` is mounted before `express.json` with `express.raw`;
  only a verified event marks an order paid. Retries with the same payment are no-ops; a wrong
  amount or currency is logged and ignored; an expired session is forgotten. An open session is
  reused, so two tabs cannot pay twice.
- `POST /orders/:id/checkout` (owner) returns the session URL; `POST /orders/:id/pay` is now
  staff-only ("record a payment by hand", method `manual`). Paying still takes the stock warehouse
  by warehouse in one transaction and records the allocations.
- Order: `checkoutSessionId` (unique; kept out of the API's order JSON), `paymentMethod` is now
  written (`stripe`, `manual`, old orders `fake`). Migration `stripe_checkout`.
- Web: checkout goes straight to the session URL; `/pay/<session id>` is the simulator page in
  Stripe's look (test cards, decline, insufficient funds); the order page handles
  `?checkout=success|cancelled` and, when the browser returns before the webhook, re-renders
  every 2 s until the order is paid ("Confirming your payment…"). "Pay now" starts a new session.
- Env: `STOREFRONT_URL` (set in `compose.yaml`, `deploy/compose.yaml` and CI; on the server it
  must be the public address or redirects go to `localhost:3000`), `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `PAYMENT_CURRENCY`.
- Tests: 5 API tests (simulator with decline, session reuse, warehouse allocation, unsigned and
  tampered webhooks, retries, wrong amount, staff payment, customers get 403); the older tests
  record payments as staff. E2E pays through the simulator (decline, then pay) with axe on the
  simulator page; its muted grey was darkened to pass contrast.
