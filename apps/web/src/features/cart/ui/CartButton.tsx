'use client';

import { Icon } from '@/shared/ui/Icon';
import { useCart } from '../model/CartProvider';

export function CartButton() {
  const { cart, setOpen } = useCart();
  const count = cart?.count ?? 0;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
      className="relative"
      data-testid="cart-button"
    >
      <Icon name="bag" width={21} height={21} />
      {count > 0 && (
        <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center bg-accent px-1 font-mono text-[10px] font-semibold text-accent-ink">
          {count}
        </span>
      )}
    </button>
  );
}
