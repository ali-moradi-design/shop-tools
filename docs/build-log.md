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
