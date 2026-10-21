# Promotions module

Owns discount code CRUD (admin) and discount calculation used at checkout.

Ordering depends only on the public `DiscountService` (`computeDiscount`, `recordUse`) — not on promotions HTTP or mongoose models.
