'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { clientApi } from '@/shared/api/client';
import type { Cart } from './types';

interface CartState {
  cart: Cart | null;
  open: boolean;
  busy: boolean;
  error: string | null;
}

interface CartActions {
  setOpen: (open: boolean) => void;
  add: (productId: string, sku: string, quantity?: number) => Promise<void>;
  update: (productId: string, sku: string, quantity: number) => Promise<void>;
  remove: (productId: string, sku: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/*
 * Two contexts: the actions never change, so components that only add to the cart
 * or refresh it (buy box, sign-in, checkout) do not re-render when the cart changes.
 */
const StateContext = createContext<CartState | null>(null);
const ActionsContext = createContext<CartActions | null>(null);

/** Client cart state; the cart itself lives in the API (guest cookie or account). */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actions = useMemo<CartActions>(() => {
    const run = async (request: () => Promise<{ data: Cart }>) => {
      setBusy(true);
      setError(null);
      try {
        setCart((await request()).data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
        throw err;
      } finally {
        setBusy(false);
      }
    };
    return {
      setOpen,
      refresh: () => run(() => clientApi<{ data: Cart }>('/cart')).catch(() => {}),
      add: async (productId, sku, quantity = 1) => {
        await run(() => clientApi('/cart/items', { method: 'POST', body: JSON.stringify({ productId, sku, quantity }) }));
        setOpen(true);
      },
      update: (productId, sku, quantity) =>
        run(() =>
          clientApi(`/cart/items/${productId}/${encodeURIComponent(sku)}`, {
            method: 'PATCH',
            body: JSON.stringify({ quantity }),
          }),
        ),
      remove: (productId, sku) =>
        run(() => clientApi(`/cart/items/${productId}/${encodeURIComponent(sku)}`, { method: 'DELETE' })),
    };
  }, []);

  // Load the visitor's cart once (the guest cookie or session decides which).
  useEffect(() => {
    let alive = true;
    clientApi<{ data: Cart }>('/cart')
      .then((res) => alive && setCart(res.data))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const state = useMemo<CartState>(() => ({ cart, open, busy, error }), [cart, open, busy, error]);

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useCartState(): CartState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useCartState must be used inside <CartProvider>');
  return ctx;
}

export function useCartActions(): CartActions {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useCartActions must be used inside <CartProvider>');
  return ctx;
}

/** Both halves, for components that show the cart and change it. */
export function useCart(): CartState & CartActions {
  return { ...useCartState(), ...useCartActions() };
}
