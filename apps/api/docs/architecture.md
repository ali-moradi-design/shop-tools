# Architecture — Modular Monolith

Feature modules (bounded contexts) own their vertical slice. Cross-module access goes through each module's public `index.ts` (or shared kernel), not deep internals.

## Layout

```
src/
  shared/                 # kernel: errors, pagination, logger, middleware, config, VOs, UoW, storage
  modules/
    identity/             # auth, users, RBAC
    catalog/              # products, featured, cover uploads, stock rules
    ordering/             # cart, orders, checkout, pay
    reviews/
    engagement/           # favorites
    promotions/           # discount CRUD + calculate API for checkout
    reporting/            # issue reports, analytics, admin dashboard
  app.ts                  # compose modules under /api/v1
  server.ts
  scripts/
    seed.ts               # orchestrator
    seed/                 # helpers per module (identity, catalog, promotions)
```

Each module typically contains:

| Folder | Role |
|--------|------|
| `domain/` | Entities, repository ports, pure rules |
| `application/` | Services / use-cases |
| `infra/` | Mongoose models, repositories, module wiring |
| `http/` | Routes, controllers, validators, OpenAPI path fragments |
| `index.ts` | Public API: `register*Routes`, services/repos needed elsewhere, types |

## Request flow

```
HTTP (module http/) → application → domain ports/rules → module infra (mongoose)
```

`app.ts` mounts each module's routes on `/api/v1` (paths unchanged from the DDD API).

## Ownership highlights

- **Cart + orders + checkout/pay** → `ordering` (uses catalog stock + promotions discount *application*).
- **Discount CRUD** → `promotions`; ordering never owns admin discount routes.
- **Products / stock / uploads** → `catalog`.
- **Auth middleware** → `identity` (`authenticate`, `requirePermission`).

## Path aliases

`@shared/*`, `@modules/*` (tsconfig + Vitest + tsc-alias).

## Boundaries

ESLint restricts deep imports across modules (`@modules/<other>/domain|application|infra|http/**`). Prefer `@modules/<name>` public API. Same-module deep imports are allowed. Identity HTTP auth middleware is a sanctioned public surface for other modules' routes.
