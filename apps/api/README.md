# Welt & Grain API — Modular Monolith

Node.js + TypeScript + Express + **MongoDB/Mongoose** shop-tools backend: JWT auth, RBAC, products, reviews, orders (fake payments + stock), cart, favorites, discount codes, local image uploads, and admin dashboard.

> Business routes remain under **`/api/v1/...`**. Health: `/api/health`. Swagger: `/api/docs`.

## Architecture

**Modular monolith** — bounded contexts as feature modules under `src/modules/*`, plus a shared kernel:

```
src/
  shared/                 # errors, pagination, logger, middleware, config
  modules/
    identity/             # auth, users, rbac
    catalog/              # products, featured, uploads
    ordering/             # cart, orders, checkout, pay
    reviews/
    engagement/           # favorites
    promotions/           # discount CRUD
    reporting/            # reports + admin dashboard
  app.ts                  # registers each module
  server.ts
  scripts/seed.ts
```

Cross-module access via public `index.ts` (or `@shared`). Details: [docs/architecture.md](docs/architecture.md) · [docs/modules.md](docs/modules.md).

## Stack

- Express 5, Mongoose, Zod, Helmet, express-rate-limit, multer, cookie-parser
- bcryptjs, jsonwebtoken, dotenv, cors, morgan, swagger-ui-express
- ESLint + Prettier, tsx, tsc-alias
- Vitest + supertest + mongodb-memory-server (Mongo binary **7.0.14**)

## Setup

```bash
cp .env.example .env
npm install
npm run seed
npm run dev
```

Default admin (development only): `admin@shop-tools.local` / `Admin123!`; production sets `ADMIN_EMAIL` / `ADMIN_PASSWORD`  
Sample discounts: `WELCOME10`, `FLAT5`.


### Cookie auth (Next.js / browsers)

Register / login / refresh return tokens in JSON **and** set httpOnly cookies (`accessToken`, `refreshToken`). Protected routes accept `Authorization: Bearer <token>` first, otherwise the `accessToken` cookie. Refresh/logout accept body **or** `refreshToken` cookie.

CORS is `credentials: true`. Set `CORS_ORIGIN` to the frontend origin (e.g. `http://localhost:3000`). Do **not** use `*` in production with credentials.

```ts
const API = 'http://localhost:4000';

await fetch(`${API}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ email, password }),
});

const me = await fetch(`${API}/api/v1/users/me`, { credentials: 'include' });

await fetch(`${API}/api/v1/auth/refresh`, {
  method: 'POST',
  credentials: 'include',
});

await fetch(`${API}/api/v1/auth/logout`, {
  method: 'POST',
  credentials: 'include',
});
```

Cookie flags: `httpOnly`, `path=/`, `secure` from `COOKIE_SECURE` (default true in production), `sameSite` from `COOKIE_SAME_SITE` (default `lax`). Optional `COOKIE_DOMAIN`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | tsx watch |
| `npm run build` | `tsc` + `tsc-alias` |
| `npm start` | run compiled server |
| `npm run lint` | ESLint |
| `npm run seed` | identity + catalog + promotions helpers |
| `npm test` | unit + integration |

## Path aliases

`@shared/*`, `@modules/*`

## License

MIT
