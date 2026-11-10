# Port plan: features from leather-shop and shop-books

Everything built for the two sibling shops, to be brought into `shop-tools` in a later
session. Start that session with:

> Execute `docs/port-plan.md`, phase by phase. Ask me the "Before you start" questions first.

The plan says **what** to build and **where the proven code is**. The sibling repos hold
working, tested versions of every piece; copy and adapt them rather than re-inventing.
`shop-tools` is closest to **leather-shop** (modular-monolith API under `apps/api/src/modules`,
the `/api/[...path]` proxy route, `shared/api/{client,server,fetcher,visitor-ip}.ts`). The
differences that matter: **Prisma on MySQL** (leather uses Mongoose; shop-books uses Prisma on
Postgres, so its Prisma code is the closer model for the data layer), and an existing
`proxy.ts` that sets a **CSP nonce** (leather has a static CSP).

## Before you start (ask the user, all at once)

1. `CLAUDE.md` says "No new UI code before the mockups are approved". This plan adds many
   screens (admin pages, account, checkout simulator, About/Help). Build them in the shop's
   existing look without new mockups, or make mockups first?
2. Merge each phase to `main` as it goes (every merge deploys), or collect phases?
3. The sibling shops chose: Stripe **simulator** on (no Stripe account), emails kept in the
   **admin outbox** (no SMTP), **Sentry and analytics off**. Same here?

## Source repositories

| Repo | What to read |
| --- | --- |
| `ali-moradi-design/leather-shop` | PRs #32–#40. Closest architecture. |
| `ali-moradi-design/shop-books` | PRs #15–#20. Prisma versions of the API pieces, Server-Action forms. |

Attach them with `add_repo` (read access) and read the files named below.

## Working rules

- Explain in Persian with the user's formatting rules (`CLAUDE.md`); repo files in English.
- One PR per phase (smaller if a phase is large): branch → local checks → PR → CI green →
  squash merge. Update `docs/build-log.md` in every PR.
- Local checks before each push: API `lint`, `tsc`, `test`; web `lint`, `typecheck`, `test`,
  `next build`; E2E against the production build (`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`
  in the sandbox).
- Forms: `react-hook-form` + `zod`, tables: TanStack Table (as in leather-shop) — confirm what
  shop-tools already uses and stay consistent.
- After code changes run `graphify update .`.

---

## Phase 1 — Admin panel (leather-shop PRs #32–#35)

shop-tools admin has only Orders and "Products & stock". Bring it to the leather-shop level.

- Admin shell with a side menu (`features/admin/ui/AdminNav.tsx`), each page checks the admin
  role next to its data (`requireAdmin`, `early()` for parallel reads).
- **Products**: list with search, category/stock filters, sortable headers, multi-select bulk
  actions (feature/unfeature, percent sale, end sale, move to trash); create and edit forms
  with every field, image upload and ordering, size/variant table with stock; **trash** with
  restore (API: soft delete + restore endpoints, `compareAtPrice: null` clears a sale, stock
  sort/filter).
- **Orders**: status filter tabs, search by number or name, detail page with history and notes.
- **Discounts**, **Customers** (block, admin role; an admin cannot block or demote themselves),
  **Reviews** moderation.
- **Dashboard**: 30-day revenue chart, orders by status, best sellers, low stock.
- Server Actions with `updateTag('products')`/`refresh()` (not `revalidateTag(…, 'max')`), zod
  schemas shared by form and action (`features/admin/model/product-form.ts`).
- Uploads route that serves only product images (no `..` in paths).
- Review lessons from leather #33–#35: split cart context into state/actions to avoid
  re-renders; parallel reads on admin and product pages; second card photo only on hover;
  `prefetch={false}` on admin table row links; DB indexes for order list and stock sort;
  `preload` instead of the deprecated `priority` on images.

## Phase 2 — Product page (leather-shop PR #32)

Compare with what shop-tools has and add what is missing: gallery with zoom/lightbox and swipe,
description and accordion details (specs suit tools: power, voltage, warranty…), low-stock
marks, sticky add-to-cart bar on phones, rating summary with per-star counts
(`GET /reviews/summary`), related products, recently viewed, share button, discount percent.

## Phase 3 — Payments: Stripe Checkout with a local simulator (leather #36, shop-books #15)

Replaces the `fake` payment method.

- API: `PaymentGateway` port, `StripeGateway` (test keys only; env refuses `sk_live_`),
  `MockStripeGateway` + `MockCheckout` used when `STRIPE_SECRET_KEY` is unset. The simulator
  signs `checkout.session.completed` with `stripe.webhooks.generateTestHeaderString` and POSTs
  it to the real webhook endpoint (`http://127.0.0.1:$PORT/...`).
  Files: leather `apps/api/src/modules/ordering/{application/payments.port.ts,
  application/checkout.service.ts, infra/payments/*, http/routes/payments.routes.ts}`.
- Webhook mounted **before** `express.json` with `express.raw`; only the verified webhook marks
  an order paid; idempotent on retries; ignores a wrong amount; reuses an open session per order.
- `POST /orders/:id/pay` becomes staff-only ("record payment by hand").
- Order: `checkoutSessionId` (unique), later `refundId`, shipment fields (Prisma migration —
  generate SQL with `prisma migrate diff --from-schema-datamodel old --to-schema-datamodel new
  --script` if no shadow DB).
- Web: `/pay/[sessionId]` simulator page styled like Stripe Checkout; order page handles
  `?checkout=success|cancelled` and a late webhook (`PaymentPending` refreshes).
- Env: `STOREFRONT_URL` (**must** be set in `deploy/compose.yaml` and on the server, or
  redirects go to `localhost:3000`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `PAYMENT_CURRENCY`. E2E env must set `STOREFRONT_URL` to the E2E web port.
- Tests: signature rejected, retry idempotent, wrong amount ignored, customer cannot `/pay`.

## Phase 4 — Email, accounts, newsletter (leather #36, shop-books #15)

- Mailer: SMTP when `SMTP_URL` is set, always stored in an `Email` table (the outbox, shown in
  Admin → Emails). **Redact `token=…` in stored copies when the email was actually sent**
  (leather #37). Templates: welcome, password reset/changed, guest welcome, order
  confirmed/shipped/cancelled, return update, back in stock, low stock (to admins or
  `ADMIN_ALERT_EMAIL`), newsletter welcome with unsubscribe.
- Notifications subscribe to domain events (`OrderPaid`, `OrderShipped`, `OrderCancelled`,
  `ReturnUpdated`, `StockRestored`, `StockLow`); never let an email failure fail the request.
- Forgot/reset password (hashed one-time tokens, 1 h, sign out other sessions).
- Guest checkout: passwordless account signed in at once; the same email never signs in a
  second time (sends a set-password link instead).
- Account settings: profile (email change needs the current password), password change
  (keeps this session), address book (max 10, default address, "save this address" at
  checkout, saved address prefills checkout).
- Newsletter table and endpoints; the footer form saves; unsubscribe page uses a button (mail
  scanners open links).

## Phase 5 — Orders after payment (leather #36)

- Customer cancel before shipping, with Stripe refund through the gateway.
- Returns (and exchanges if sizes/variants apply): window 30 days after shipping, no double
  returns of the same unit, refund share of discounts, staff flow requested → approved →
  received → refunded. Key form rows by index, not SKU (SKUs may contain dots — leather #38).
- Shipment: carrier + tracking number when marking shipped, tracking link on the order page
  and in the email, printable 4×6 label with a Code 39 barcode (`shared/lib/barcode.ts`, print
  CSS in `globals.css`).

## Phase 6 — Catalog extras (leather #36)

- Search suggestions endpoint (`GET /products/suggest`, mounted before `/:id`) and an
  accessible combobox in the header (debounce, abort, cache, keyboard).
- Back-in-stock alerts on sold-out variants; emails sent when stock goes 0 → >0 (from product
  edits, cancellations and CSV import).

## Phase 7 — Admin tools (leather #36)

- CSV export (products, orders, customers, subscribers) with formula-injection defence and a
  BOM; product CSV import with a dry run and per-row errors (`shared/csv.ts`).
- Insights on the dashboard: average order, returning-customer rate, sales by category.
- Activity log of staff writes (middleware on the API router, after the response).
- Roles page (built-in `admin`/`customer` protected in the API).
- Admin pages: Returns, Emails (+ subscribers), A/B tests, Roles, Activity, Import.

## Phase 8 — A/B testing (leather #36, shop-books #15)

- `shared/lib/ab/experiments.ts` (variants, weights), sticky cookies assigned in `proxy.ts`
  before render (no flash). **Merge into the existing nonce `proxy.ts`**; keep its matcher
  rules (prefetch exclusion) in mind — prefetches must still get the cookies or render control.
- Read the variant only inside parts that are already dynamic (cookies make a part dynamic).
- Events API (`exposure`, `add_to_cart`, `purchase`, unique per visitor, rate-limited) and a
  results page with uplift and a two-proportion z-test p-value. Send server-side events with
  `after()` so the user does not wait (shop-books #16).

## Phase 9 — Content, search engines, monitoring

- Rewrite About and Help & FAQ (searchable FAQ with `useDeferredValue`, shortcuts, contact
  block). Fix contrast: `.heading` sets the ink colour, so headings on dark bands need
  `text-white` (axe caught this).
- **Keep the shop out of search engines**: root `metadata.robots` noindex/nofollow,
  `X-Robots-Tag` header on every response (next.config headers and the API), delete
  `sitemap.ts` and JSON-LD, `robots.txt` allows crawling (so noindex is seen) but refuses AI
  crawlers, API serves `Disallow: /`.
- Optional Sentry and analytics, off unless env is set. Server: **`@sentry/node`** in
  `instrumentation.ts` (NOT `@sentry/nextjs`: it broke prerendering of `/_global-error` about
  half the time). Browser: `@sentry/browser` loaded at idle in `instrumentation-client.ts`.
  CSP must allow the Sentry/analytics hosts only when configured.

## Phase 10 — Three review rounds

Each round: review the new code for bugs, extra re-renders, serial requests and Next.js
usage; fix; PR; merge. Things that were actually found in the siblings and should be checked
here from the start:

- Status form kept the old next status after a change (key the inner form by status).
- `apiGetJson` read an error body twice ("Body is unusable") → page crash on any non-JSON
  error. Read the body once.
- **Rate limits per visitor**: storefront page renders all reach the API from one address, so
  a global limit is shared by every visitor (leather #40, shop-books #20). Skip calls from the
  storefront server (private address and no `X-Forwarded-For`; the API is not published),
  forward the visitor IP on browser/auth calls, `TRUST_PROXY: 1`, default
  `RATE_LIMIT_MAX` 3000 per 15 min. shop-tools already has `RATE_LIMIT_MAX`, `TRUST_PROXY` and
  `visitor-ip.ts`: verify the server-render path does not share one bucket.
- Messages taken from the query string (`?msg=…`) let anyone put text on a trusted page; use
  flags with fixed text.
- `safeNext` must refuse `//host` and `/\host`.
- Admin pages: one request for account data instead of `/users/me` then `/account`.
- Regression E2E: open several product pages by clicking (client navigation).

## Done when

- All phases merged with CI green; E2E covers the simulated Stripe purchase, every admin page
  under axe, guest checkout, forgot password, search suggestions and noindex.
- `docs/build-log.md` describes each phase.

## On the server (tell the user at the end)

`deploy-kit` only changes `IMAGE_TAG`; it does not copy `compose.yaml`. Every new env var must
be added to the server's `compose.yaml` by hand (or copy `deploy/compose.yaml` over it), then
`docker compose up -d`. At least: `STOREFRONT_URL: https://shop-tools.ali-moradi-develop.com`.
Migrations run when the API container starts (the `command` of the `api` service in
`deploy/compose.yaml` runs `prisma migrate deploy`), so the server copy must keep that line.
