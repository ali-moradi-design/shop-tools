'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const COMPARE_MAX = 4;
const STORAGE_KEY = 'toolbench-compare';

export interface CompareItem {
  slug: string;
  title: string;
  image?: string;
  /** Category slug: only products of one category can be compared. */
  category: string;
  categoryName: string;
}

interface CompareState {
  items: CompareItem[];
  /** Why the last add was refused, if it was. */
  message: string | null;
  has: (slug: string) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  href: string;
}

const Ctx = createContext<CompareState | null>(null);

function load(): CompareItem[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? (raw as CompareItem[]).filter((i) => i && typeof i.slug === 'string').slice(0, COMPARE_MAX) : [];
  } catch {
    return [];
  }
}

/** The compare tray's state: up to four products of one category, kept in this browser. */
export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // read the saved list after the first render (the server cannot know it)
  useEffect(() => {
    // localStorage is unavailable during server rendering, so this must happen after hydration
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* private mode: the tray still works for this visit */
    }
  }, [items, ready]);

  const toggle = useCallback((item: CompareItem) => {
    setMessage(null);
    setItems((current) => {
      if (current.some((i) => i.slug === item.slug)) return current.filter((i) => i.slug !== item.slug);
      if (current.length > 0 && current[0].category !== item.category) {
        setMessage(`You are comparing ${current[0].categoryName}. Clear the tray to compare ${item.categoryName}.`);
        return current;
      }
      if (current.length >= COMPARE_MAX) {
        setMessage(`You can compare up to ${COMPARE_MAX} tools.`);
        return current;
      }
      return [...current, item];
    });
  }, []);

  const value = useMemo<CompareState>(
    () => ({
      items,
      message,
      has: (slug) => items.some((i) => i.slug === slug),
      toggle,
      remove: (slug) => {
        setMessage(null);
        setItems((c) => c.filter((i) => i.slug !== slug));
      },
      clear: () => {
        setMessage(null);
        setItems([]);
      },
      href: `/compare?slugs=${items.map((i) => i.slug).join(',')}`,
    }),
    [items, message, toggle],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCompare(): CompareState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompare must be used inside <CompareProvider>');
  return ctx;
}
