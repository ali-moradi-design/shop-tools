'use client';

import Form from 'next/form';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { clientApi } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import { Icon } from '@/shared/ui';

interface Suggestion {
  id: string;
  title: string;
  slug: string;
  model?: string;
  category: string;
  image?: string;
  price: number;
  inStock: boolean;
}

/**
 * Matches for what is typed so far: waits for a pause in typing, cancels the request
 * for older text, and keeps answers for text it has already asked about.
 */
function useSuggestions(q: string) {
  const [items, setItems] = useState<Suggestion[]>([]);
  const cache = useRef(new Map<string, Suggestion[]>());
  const term = q.trim().toLowerCase();
  useEffect(() => {
    if (term.length < 2) return;
    const hit = cache.current.get(term);
    if (hit) {
      setItems(hit);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      clientApi<{ data: Suggestion[] }>(`/products/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then(({ data }) => {
          cache.current.set(term, data);
          setItems(data);
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);
  return term.length < 2 ? [] : items;
}

/** The header search: a plain GET form to /search, with suggestions as an ARIA combobox. */
export function SearchBox() {
  const router = useRouter();
  const box = useRef<HTMLFormElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const suggestions = useSuggestions(q);
  const showList = open && suggestions.length > 0;
  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  // a click anywhere else closes the list
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !box.current?.contains(e.target as Node) && close();
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') return close();
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // -1 is the text box itself; past either end wraps around
      setActive((i) => {
        const next = i + step;
        return next >= suggestions.length ? -1 : next < -1 ? suggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter' && active >= 0 && active < suggestions.length) {
      e.preventDefault();
      router.push(`/products/${suggestions[active].slug}`);
      setQ('');
      close();
    }
  };

  return (
    <Form ref={box} action="/search" role="search" onSubmit={close} className="relative order-last flex h-[42px] min-w-0 basis-full border-2 border-ink sm:order-none sm:flex-1 sm:basis-auto">
      <label htmlFor="site-search" className="sr-only">Search tools, SKUs or specs</label>
      <input
        id="site-search"
        name="q"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && active < suggestions.length ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder="Search tools, SKUs or specs — e.g. “18V hammer drill”"
        className="min-w-0 flex-1 px-3.5 text-[14px] outline-none placeholder:text-mute"
      />
      <button type="submit" className="bg-ink px-5 font-mono text-[12px] tracking-[0.08em] text-white hover:text-accent">
        <span className="sr-only sm:not-sr-only">SEARCH</span>
        <Icon name="search" width={18} height={18} className="sm:hidden" />
      </button>
      <ul id={listId} role="listbox" aria-label="Suggestions" className={cn('absolute -inset-x-0.5 top-full z-50 border-2 border-ink bg-paper', !showList && 'hidden')}>
        {suggestions.map((s, i) => (
          // an option holds no link (ARIA forbids focusable content there): a click navigates, and keyboard users press Enter in the box
          <li
            key={s.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              router.push(`/products/${s.slug}`);
              setQ('');
              close();
            }}
            className={cn('flex cursor-pointer items-center gap-3 px-3 py-2 text-[14px] hover:bg-soft', i === active && 'bg-accent text-accent-ink')}
          >
            <span className="relative h-11 w-11 shrink-0 bg-paper">
              {s.image && <Image src={s.image} alt="" fill sizes="44px" className="object-contain mix-blend-multiply" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{s.title}</span>
              <span className="block font-mono text-[11px] text-steel">{s.model ? `${s.model} · ` : ''}{s.category}</span>
            </span>
            <span className="font-mono text-[13px]">{s.inStock ? formatMoney(s.price) : 'Sold out'}</span>
          </li>
        ))}
      </ul>
    </Form>
  );
}
