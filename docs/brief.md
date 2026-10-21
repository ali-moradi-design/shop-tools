# Tools shop brief

Copied on 2026-10-21 from `notes/shops-brief.md` in the private roadmap repo
(`main`): the update section, the common part, the Tools section and the Tools
build plan. The text below is kept as written there.

## Decisions that override the common part

- English only (the five languages in the common part do not apply).
- The tools shop starts from a plain copy of `leather-shop` (no history);
  `leather-shop` itself is not changed.
- Database: MySQL instead of MongoDB.
- Rendering: SSR instead of PPR.

## Update 2026-10-21: final three shops

- Books (`shop-books`): built.
- Leather (`leather-shop`, MongoDB + PPR): built. It replaces the clothes shop
  (`shop-fashion` is dropped): both would be MongoDB with sizes and colors.
- Tools (`shop-tools`, repo https://github.com/ali-moradi-design/shop-tools):
  the third shop, see "Tools: build plan" at the end. MySQL + SSR, so the shops
  show three databases.

Decisions from 2026-10-20. Demo 5 in notes/demos.md. The reusable base
`commerce-kit` (notes/commerce-kit-brief.md) is POSTPONED until the other demos
are done; for now the three shops are built as three independent projects with
separate code, separate repos and separate databases. Each shop gets its own
build sessions (one shop per session series); this file is the handoff for all
three and is safe to make public.

## Common to all three shops

- Features: catalog with categories and filters, search, product page, cart,
  checkout with a fake payment gateway (a simulated gateway page), customer
  account and order history, favorites, reviews, discount codes, a small admin
  (products, orders, stock), demo accounts, nightly demo-data reset.
- Payments: one payment interface with the fake gateway as the only
  implementation (real gateways later, in commerce-kit).
- SEO: metadata, JSON-LD (Product, BreadcrumbList), sitemap, OG images.
- Languages: English, German, Spanish, Persian, Arabic (Persian and Arabic RTL;
  logical CSS; native digits by default with a Latin-digit setting; Gregorian
  calendar; Vazirmatn for Persian/Arabic; German text ~30% longer). The UI is in
  all five languages; product content (names, descriptions, categories) is in
  English, Spanish and Arabic, with English as the fallback for German and Persian.
- Money in minor units with a currency code; formatting with `Intl`.
- UI: each shop has its own, clearly different look (not one template with three
  colors). Mockups first as images (HTML/CSS rendered to PNG with Playwright);
  no UI code before the user approves. Pixel Atelier may be used where it fits,
  but it is not required.
- Quality: TypeScript strict, ESLint + Prettier, FSD in the web apps, Vitest,
  Playwright E2E for the full purchase path (browse → cart → fake payment →
  order visible in admin), axe checks; CI on GitHub Actions with a required check.
- Deploy (roadmap phase 8): three containers per shop (web, api, database) with
  memory limits; MongoDB `--wiredTigerCacheSizeGB 0.25`; MySQL small buffer pool
  and `performance_schema` off.
- No blog for now (Payload comes with commerce-kit later).

## Tools

Tools (`shop-tools`)

- Technical specs per category; filter by specs (ranges, units); side-by-side
  compare of up to four products; stock per warehouse.
- Look: sharp and industrial, dense information, clear tables.

## Tools: build plan (2026-10-21)

The tools shop starts from a plain copy (no history) of `leather-shop`, because
it is the most complete shop: features, tests, CI, security fixes
(`docs/security.md`), deploy files and nightly reset. Do not change
`leather-shop` itself.

- Database: switch the API from MongoDB/Mongoose to MySQL. Use the data layer
  of `nodejs-bookshop-ddd-mysql` (the user's own MySQL edition) as the
  reference for the ORM and migrations; keep the API contract of `leather-shop`
  where possible so the web app and tests change little.
  Model: products with typed specs per category, variants where needed,
  stock per warehouse; money in minor units.
- Rendering: switch the storefront from PPR to SSR (always-fresh prices and
  stock), and say in the docs why.
- Keep from `leather-shop`: cart, checkout, simulated gateway, discount codes,
  account, favorites, reviews, admin, SEO, demo reset, security hardening,
  the test setup (unit, integration, Playwright + axe) and the single `ci` check.
- Add for tools: specs per category, filter by specs (ranges, units),
  side-by-side compare of up to four products, stock per warehouse.
- Look: new, sharp and industrial, dense information, clear tables (not the
  leather look). Mockups first as images, approval before UI code.
- Language: English only (decided 2026-10-21, like `leather-shop`; this
  overrides the five languages in the common part). Catalog content: generated
  demo data with free images, no copied brand.
- Deploy (phase 8): web, api and MySQL containers; MySQL small buffer pool and
  `performance_schema` off; integration tests on a MySQL service in CI.

How the session starts: prerequisites (as above, plus read access to
`leather-shop` and `nodejs-bookshop-ddd-mysql`), copy this brief (common part +
Tools sections) into `docs/brief.md`, copy `leather-shop`, make it run, then
switch the database in small PRs before any new UI.
