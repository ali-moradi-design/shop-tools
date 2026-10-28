# Code walkthrough plan

For a separate session in which the owner asks for the code to be explained **step by step in
Persian**, one step at a time (explain only the current step, no spoilers for later ones).
This file lists, in the order things were built, what each step did, which files to open,
the decisions behind it and the bugs found on the way. `docs/build-log.md` is the short
history; this file is the teaching order.

How to teach a step: (1) the problem it solves in one sentence, (2) open the files in the
listed order and read the important lines, (3) show how to run or test it, (4) one thing that
could go wrong (the bug column), (5) ask whether to continue.

Repo layout in one minute: pnpm workspace; `apps/api` (Express 5, modular monolith, Prisma,
MySQL), `apps/web` (Next.js 16, React 19, FSD folders), `deploy/` (Nginx + compose),
`docs/` (brief, build-log, ssr, security, mockups), `.github/workflows/ci.yml`.

| # | Step | Open these files | Key idea | Bug or lesson |
| --- | --- | --- | --- | --- |
| 0 | Brief and plan | `docs/brief.md`, `CLAUDE.md` | Scope first, decisions in writing | — |
| 1 | Copy of the leather shop as a base | `docs/build-log.md` (Step 1) | Start from working code; remove brand-specific data later | Names and data of the old shop had to be hunted down |
| 2 | Mockups before UI | `docs/mockups/*.jpg`, `docs/mockups/build.mjs` | Approve the look before writing UI; mockups are rendered from HTML with the real photos | A script overwrote the repo mockups once: parametrize the output folder |
| 3 | Photos | `apps/web/public/catalog/README.md`, `manifest.json` | 500 images, 900 px WebP; the owner decided the DEWALT photos may be in the public demo repo | Rate limits when downloading |
| 4 | MySQL foundation | `apps/api/prisma/schema.prisma`, `src/shared/infra/prisma/{client,transaction}.ts`, `tests/global-setup.ts`, `compose.yaml` | One Prisma client; a transaction client travels in `AsyncLocalStorage` so repositories stay unaware of transactions | `migrate dev` does not run non-interactively: use `migrate diff` + `migrate deploy` |
| 5 | Repositories on MySQL | `src/modules/*/infra/*Repository.ts`, `src/modules/*/infra/mappers.ts` | Same ports (interfaces) as before, new adapters: this is why the domain layer did not change | Prisma is strict about types (`"true"` is not a boolean) |
| 6 | Remove MongoDB | `docs/build-log.md` (Step 3) | Delete what is unused; guest-cart cleanup replaced the TTL index | — |
| 7 | PPR → SSR | `docs/ssr.md`, `apps/web/src/proxy.ts`, `shared/config/csp.ts`, `app/layout.tsx` (`force-dynamic`) | Prices and stock must be current; SSR needs no cache invalidation; per-request CSP nonce removes `'unsafe-inline'` | Next 16 renamed middleware to `proxy`; `NODE_ENV` other than production breaks `next build` |
| 8 | Tools data model | `prisma/schema.prisma` (Category, SpecDefinition, ProductSpec, ProductVariant, Warehouse, StockLevel), migration `20261021150000_tools_domain` | EAV for specs: one row per (product, spec); numbers in `valueNum` (indexed) so range queries are fast; `Product.stock` is a denormalized total | JSON columns for string lists; integer cents for money |
| 9 | Units | `src/modules/catalog/domain/units.ts`, `tests/unit/domain/units.test.ts` | Store in a base unit, show in any unit (`displayed = base × factor`) | Floating point: round only when displaying |
| 10 | Spec filters | `domain/spec-filter.ts`, `domain/spec.entity.ts`, `infra/ProductRepository.ts`, `http/validators/products.validation.ts` | A small grammar (`40..100Nm`, `..100`, `18`, `Brushless,Brushed`) parsed once, converted to base units, then bound as parameters | Express 5 made `req.query` read-only: `shared/http/middleware/validate.ts` now redefines it |
| 11 | Facets and compare | `application/product.service.ts` (`facets`, `compare`), `http/controllers`, `shared/http/docs/*` | The sidebar needs min/max and counts; compare returns rows with `best[]` and `same` | A category check: only products of one category can be compared |
| 12 | Stock per warehouse | `modules/ordering/application/use-cases/pay-order.ts`, `infra/ProductRepository.ts` (`decrementStock`), `shared/infra/prisma/transaction.ts` | Pay = one transaction: lock rows with `SELECT … FOR UPDATE` in dispatch order (BER, HAM, MUC), take units, store allocations | Compensation (restock) is only for the no-transaction path, otherwise units were restocked twice |
| 13 | Seed of 500 products | `src/scripts/seed/catalog/{classify,taxonomy,generate,random}.ts`, `dewalt-products.json`, `scripts/seed/catalog.ts` | Real names and photos, generated but reproducible specs, prices and stock (seeded random) | A few products (e.g. aprons) needed classification rules |
| 14 | Storefront design system | `apps/web/src/app/globals.css`, `app/layout.tsx`, `shared/ui/*` | Tokens in CSS variables (`@theme`), small classes (`.btn`, `.panel`, `.tag`) instead of many utilities | Contrast: muted text must be at least 4.5:1 |
| 15 | Category page and filters | `app/categories/[slug]/page.tsx`, `features/catalog-filters/{model/params.ts,ui/FilterSidebar.tsx}` | All filter state lives in the URL, so it can be shared and the back button works | `setState` in an effect is rejected by the lint rule: adjust state while rendering |
| 16 | Compare in the browser | `features/compare/*` | A provider keeps up to 4 products in `localStorage`; the table marks the best values | A client component must not import a barrel that reaches server-only code |
| 17 | Product, cart, checkout, orders | `app/products/[slug]/page.tsx`, `features/add-to-cart/ui/BuyBox.tsx`, `features/cart/*`, `features/checkout/*`, `app/account/orders/[id]/page.tsx` | Stock by warehouse is shown before buying and the paid order shows where each unit shipped from | — |
| 18 | Admin | `features/admin/ui/ProductEditor.tsx`, `app/admin/*` | Stock is edited per warehouse and variant | — |
| 19 | E2E tests | `apps/web/e2e/*.spec.ts`, `playwright.config.ts` | One real browser run: purchase, filters with units, compare, accessibility (axe), SSR headers | `check()` fails on controlled checkboxes that update after navigation: use `click()` |
| 20 | CI | `.github/workflows/ci.yml` | Jobs: api (MySQL service), web, e2e, api-image; a single required `ci` job | The Docker build cannot run in the sandbox, so CI builds the image |
| 21 | Deploy files | `deploy/compose.yaml`, `deploy/nginx.conf`, `deploy/README.md`, `apps/*/Dockerfile` | MySQL private, API private, only the web port on `127.0.0.1`; API runs `prisma migrate deploy` on start | — |
| 22 | Security test | `docs/security.md` (second table), `apps/api/tests/integration/security.test.ts` | Probe like an attacker, then keep the probes as tests | SSR shared one rate-limit budget (fix: forward the visitor IP); invalid JSON gave 500 |

## Suggested order of the live sessions

1. Big picture and the data model (steps 0–1, 4, 8).
2. How a request travels: route → validator → controller → service → repository (steps 5, 10, 11).
3. Units and filters, slowly, with the tests as examples (steps 9, 10).
4. Money and stock: the payment transaction and the race test (step 12 and the concurrency test in `security.test.ts`).
5. SSR, the CSP nonce and why it matters (step 7).
6. The storefront from the URL to the pixels (steps 14–18).
7. Tests and CI (steps 19–20), deploy (step 21), security (step 22).

## Things to try while learning

- `pnpm db:up`, `pnpm migrate`, `pnpm seed`, `pnpm dev:api`, then open `/api/docs` and call `GET /products?category=drills&spec.torque=400..900in·lb`.
- Run `pnpm --filter @st/api test` and read one failing-on-purpose change: break the factor of `in·lb` in `units.ts`.
- Change a price in the admin and reload the product page (SSR: no cache to clear).
- Pay for the last unit from two browsers at once (the race test does this by code).

## Open items for the owner

- Final shop name (the working name is "Toolbench Supply Co.").
- GitHub settings: make `main` the default branch and require the `ci` check.
- The three shops later share `commerce-kit`; nothing of it exists yet.
