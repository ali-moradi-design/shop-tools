# Ordering module

Owns **cart**, **orders**, checkout, and payment.

- Cart mutations and checkout live here (`CartService`, `CheckoutCartUseCase`).
- Order lifecycle / pay / status transitions live here (`OrderService`, `PayOrderUseCase`).
- Catalog stock is read/decremented via `@modules/catalog` public API (never deep-imports catalog infra).
- Discount *application* at checkout uses `@modules/promotions` (`computeDiscount` / `recordUse`); discount CRUD admin stays in promotions.
