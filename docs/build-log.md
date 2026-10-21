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
