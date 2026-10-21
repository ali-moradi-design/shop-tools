'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { ProductFacets } from '@/entities/product/model/types';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui/Icon';
import { SORTS, type FilterKey } from '../model/params';

interface Props {
  facets: ProductFacets;
  chips?: string[];
}

/** Sticky pill bar: style chips + Filter dropdowns + sort. State lives in the URL. */
export function FilterBar({ facets, chips = [] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const set = (key: FilterKey, value?: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const active = (key: FilterKey) => params.get(key) ?? undefined;
  const chip = active('q');
  const anyFilter = ['size', 'width', 'leather', 'color', 'q'].some((k) => params.has(k));

  return (
    <div
      className={cn(
        'sticky top-[111px] z-30 flex items-center gap-3 overflow-x-auto border-b border-line bg-white px-4 py-3 text-[14px] whitespace-nowrap no-scrollbar sm:px-[46px] lg:top-[159px]',
        pending && 'opacity-70',
      )}
      aria-busy={pending}
    >
      {chips.length > 0 && (
        <>
          <Pill on={!chip} onClick={() => set('q')}>All Styles</Pill>
          {chips.map((c) => (
            <Pill key={c} on={chip === c} onClick={() => set('q', chip === c ? undefined : c)}>
              {c}
            </Pill>
          ))}
          <span className="h-7 w-px shrink-0 bg-line" />
        </>
      )}
      <span>Filter:</span>
      <Dropdown label="Size" value={active('size')} options={facets.sizes.map((s) => s.value)} onSelect={(v) => set('size', v)} grid />
      {facets.widths.length > 1 && (
        <Dropdown label="Width" value={active('width')} options={facets.widths.map((s) => s.value)} onSelect={(v) => set('width', v)} />
      )}
      <Dropdown label="Leather" value={active('leather')} options={facets.leathers.map((s) => s.value)} counts={facets.leathers} onSelect={(v) => set('leather', v)} />
      <Dropdown label="Color" value={active('color')} options={facets.colors.map((s) => s.value)} counts={facets.colors} onSelect={(v) => set('color', v)} />
      {anyFilter && (
        <button type="button" className="link-underline text-mute" onClick={() => startTransition(() => router.push(pathname, { scroll: false }))}>
          Clear all
        </button>
      )}
      <span className="ml-auto" />
      <label className="flex items-center gap-2">
        <span>Sort:</span>
        <select
          className="rounded-full border border-[#cfcfcf] bg-white px-3 py-1.5"
          value={active('sort') ?? 'featured'}
          onChange={(e) => set('sort', e.target.value === 'featured' ? undefined : e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-4 py-1.5 text-[13.5px]',
        on ? 'border-ink bg-ink font-medium text-white' : 'border-[#cfcfcf] hover:border-ink',
      )}
    >
      {children}
    </button>
  );
}

function Dropdown(props: {
  label: string;
  value?: string;
  options: string[];
  counts?: { value: string; count: number }[];
  onSelect: (value?: string) => void;
  grid?: boolean;
}) {
  const { label, value, options, counts, onSelect, grid } = props;
  return (
    <details className="group relative shrink-0">
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-1 rounded-full border px-4 py-1.5',
          value ? 'border-ink bg-ink text-white' : 'border-[#cfcfcf] hover:border-ink',
        )}
      >
        {value ? `${label}: ${value}` : label}
        <Icon name="chevron" width={12} height={12} />
      </summary>
      <div
        className={cn(
          'fixed z-40 mt-2 max-h-80 overflow-y-auto border border-line bg-white p-3 shadow-md',
          grid ? 'grid w-72 grid-cols-5 gap-1' : 'w-60',
        )}
      >
        {value && (
          <button type="button" className="col-span-5 mb-1 block w-full text-left text-[13px] text-mute underline" onClick={(e) => { closeMenu(e); onSelect(undefined); }}>
            Clear {label.toLowerCase()}
          </button>
        )}
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={(e) => { closeMenu(e); onSelect(o === value ? undefined : o); }}
            className={cn(
              grid ? 'h-10 border text-center text-[13px]' : 'flex w-full justify-between py-1.5 text-left text-[14px] hover:underline',
              grid && (o === value ? 'border-ink outline outline-1 outline-ink' : 'border-line hover:border-ink'),
            )}
          >
            <span>{o}</span>
            {counts && !grid && <span className="text-mute">{counts.find((c) => c.value === o)?.count}</span>}
          </button>
        ))}
      </div>
    </details>
  );
}

function closeMenu(e: React.MouseEvent) {
  (e.currentTarget.closest('details') as HTMLDetailsElement | null)?.removeAttribute('open');
}
