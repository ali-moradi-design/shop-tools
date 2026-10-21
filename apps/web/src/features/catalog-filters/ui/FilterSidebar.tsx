'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import type { ProductFacets, SpecFacet } from '@/entities/product/model/types';
import { cn } from '@/shared/lib/cn';
import { formatNumber, fromBase, toBase, type UnitOption } from '@/shared/lib/units';
import { formatRangeParam, parseRangeParam } from '../model/params';

/**
 * The filter sidebar: availability, price and one section per filterable specification
 * (a two-thumb range with a unit switch for numbers, checkboxes for words).
 * All state lives in the URL, so a filtered list can be shared and the back button works.
 */
export function FilterSidebar({ facets }: { facets: ProductFacets }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const update = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    const qs = next.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const active = [...params.keys()].some((k) => k.startsWith('spec.') || ['instock', 'warehouse', 'price'].includes(k));

  return (
    <aside aria-label="Filters" className={cn('panel px-4.5 pb-2', pending && 'opacity-70')} aria-busy={pending}>
      <button
        type="button"
        className="flex w-full items-center justify-between py-3 font-display text-[18px] font-bold uppercase tracking-[0.06em] lg:hidden"
        aria-expanded={open}
        aria-controls="filter-panel"
        onClick={() => setOpen((o) => !o)}
      >
        Filters {active && <span className="tag tag-accent">on</span>}
        <span aria-hidden>{open ? '−' : '+'}</span>
      </button>
      <div id="filter-panel" className={cn(open ? 'block' : 'hidden', 'lg:block')}>
        {active && (
          <button
            type="button"
            className="my-3 font-mono text-[12px] underline"
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              for (const k of [...next.keys()]) {
                if (k.startsWith('spec.') || ['instock', 'warehouse', 'price', 'page'].includes(k)) next.delete(k);
              }
              const qs = next.toString();
              startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
            }}
          >
            Clear all filters
          </button>
        )}
        <Section title="Availability">
          <Check label="In stock now" checked={params.get('instock') === '1'} onChange={(on) => update({ instock: on ? '1' : undefined })} />
          {facets.warehouses.map((w) => (
            <Check
              key={w.code}
              label={`${w.name} warehouse`}
              count={w.count}
              checked={params.get('warehouse') === w.code}
              onChange={(on) => update({ warehouse: on ? w.code : undefined })}
            />
          ))}
        </Section>
        <PriceFilter facets={facets} value={params.get('price') ?? undefined} onCommit={(v) => update({ price: v })} />
        {facets.specs.map((spec) =>
          spec.kind === 'number' ? (
            <RangeFilter key={spec.key} spec={spec} value={params.get(`spec.${spec.key}`) ?? undefined} onCommit={(v) => update({ [`spec.${spec.key}`]: v })} />
          ) : (
            <OptionFilter key={spec.key} spec={spec} value={params.get(`spec.${spec.key}`) ?? undefined} onCommit={(v) => update({ [`spec.${spec.key}`]: v })} />
          ),
        )}
      </div>
    </aside>
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line-soft py-4 last:border-b-0">
      <legend className="float-left mb-2 w-full">
        <span className="flex items-center">
          <span className="font-display text-[16px] font-bold uppercase tracking-[0.06em]">{title}</span>
          <span className="flex-1" />
          {right}
        </span>
      </legend>
      <div className="clear-both space-y-1.5">{children}</div>
    </fieldset>
  );
}

function Check({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#ffc20e]" />
      <span>{label}</span>
      <span className="flex-1" />
      {count !== undefined && <span className="font-mono text-[11px] text-mute">{count}</span>}
    </label>
  );
}

/** Dollars, two boxes. Applied when a box loses focus or Enter is pressed. */
function PriceFilter({ facets, value, onCommit }: { facets: ProductFacets; value?: string; onCommit: (v?: string) => void }) {
  const [lo, setLo] = useState('');
  const [hi, setHi] = useState('');
  // follow the URL (back button, "clear all"): adjust state while rendering, not in an effect
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    const [a, b] = (value ?? '').split('..');
    setSeen(value);
    setLo(a ?? '');
    setHi(b ?? '');
  }
  const commit = () => onCommit(lo || hi ? `${lo}..${hi}` : undefined);
  const key = (e: React.KeyboardEvent) => e.key === 'Enter' && commit();
  return (
    <Section title="Price (USD)">
      <div className="flex items-center gap-2 font-mono text-[12px]">
        <input aria-label="Minimum price" inputMode="decimal" value={lo} onChange={(e) => setLo(e.target.value)} onBlur={commit} onKeyDown={key} placeholder={String(Math.floor(facets.price.min / 100))} className="field !border py-1" />
        <span>–</span>
        <input aria-label="Maximum price" inputMode="decimal" value={hi} onChange={(e) => setHi(e.target.value)} onBlur={commit} onKeyDown={key} placeholder={String(Math.ceil(facets.price.max / 100))} className="field !border py-1 text-right" />
      </div>
    </Section>
  );
}

/** A "nice" step for a slider that covers `span` display units: 1, 2, 5, 10 … */
function niceStep(span: number): number {
  const raw = span / 100;
  const pow = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Two-thumb slider + two number boxes + a unit switch. The URL holds the value in the
 * unit the shopper chose (`spec.torque=354..885in·lb`); the API converts it.
 */
function RangeFilter({ spec, value, onCommit }: { spec: SpecFacet; value?: string; onCommit: (v?: string) => void }) {
  const units: UnitOption[] = spec.units.length ? spec.units : [{ symbol: spec.unit ?? '', factor: 1 }];
  const parsed = parseRangeParam(value);
  const [unitSymbol, setUnitSymbol] = useState(parsed.unit && units.some((u) => u.symbol === parsed.unit) ? parsed.unit : units[0].symbol);
  const unit = units.find((u) => u.symbol === unitSymbol) ?? units[0];

  // slider limits in the shown unit, rounded outwards so every product is reachable
  const rawMin = fromBase(spec.min ?? 0, unit);
  const rawMax = fromBase(spec.max ?? 0, unit);
  const step = niceStep(rawMax - rawMin || 1);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step || min + step;

  const [lo, setLo] = useState(parsed.lo ?? min);
  const [hi, setHi] = useState(parsed.hi ?? max);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // follow the URL (back button, "clear all")
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    if (parsed.unit && units.some((u) => u.symbol === parsed.unit)) setUnitSymbol(parsed.unit);
    setLo(parsed.lo ?? min);
    setHi(parsed.hi ?? max);
  }

  const commit = (nextLo: number, nextHi: number, symbol = unit.symbol) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const untouched = nextLo <= min && nextHi >= max;
      onCommit(untouched ? undefined : formatRangeParam(nextLo, nextHi, symbol));
    }, 350);
  };

  const setRange = (a: number, b: number) => {
    const nextLo = Math.max(min, Math.min(a, b));
    const nextHi = Math.min(max, Math.max(a, b));
    setLo(nextLo);
    setHi(nextHi);
    commit(nextLo, nextHi);
  };

  const switchUnit = (symbol: string) => {
    const next = units.find((u) => u.symbol === symbol);
    if (!next || next === unit) return;
    // same physical range, shown in the new unit
    const baseLo = toBase(lo, unit);
    const baseHi = toBase(hi, unit);
    const newLo = Number(fromBase(baseLo, next).toPrecision(5));
    const newHi = Number(fromBase(baseHi, next).toPrecision(5));
    setUnitSymbol(symbol);
    setLo(newLo);
    setHi(newHi);
    if (value) onCommit(formatRangeParam(newLo, newHi, symbol));
  };

  const pct = (x: number) => (max === min ? 0 : ((x - min) / (max - min)) * 100);

  return (
    <Section
      title={spec.label}
      right={
        units.length > 1 && (
          <div role="group" aria-label={`${spec.label} unit`} className="flex border border-ink font-mono text-[11px]">
            {units.slice(0, 3).map((u) => (
              <button key={u.symbol} type="button" aria-pressed={u.symbol === unit.symbol} onClick={() => switchUnit(u.symbol)} className={cn('px-1.5 py-px', u.symbol === unit.symbol && 'bg-ink text-white')}>
                {u.symbol}
              </button>
            ))}
          </div>
        )
      }
    >
      <div className="dual-range mx-1.5 mt-3" data-testid={`range-${spec.key}`}>
        <div className="absolute inset-x-0 top-[9px] h-1 bg-line" />
        <div className="absolute top-[9px] h-1 bg-ink" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
        <input type="range" min={min} max={max} step={step} value={lo} aria-label={`Minimum ${spec.label}`} onChange={(e) => setRange(Number(e.target.value), hi)} />
        <input type="range" min={min} max={max} step={step} value={hi} aria-label={`Maximum ${spec.label}`} onChange={(e) => setRange(lo, Number(e.target.value))} />
      </div>
      <div className="flex items-center gap-2 pt-2 font-mono text-[12px]">
        <label className="flex-1">
          <span className="sr-only">Minimum {spec.label} in {unit.symbol}</span>
          <input type="number" step="any" value={formatNumber(lo)} onChange={(e) => e.target.value !== '' && setRange(Number(e.target.value), hi)} className="field !border py-1" />
        </label>
        <span>–</span>
        <label className="flex-1">
          <span className="sr-only">Maximum {spec.label} in {unit.symbol}</span>
          <input type="number" step="any" value={formatNumber(hi)} onChange={(e) => e.target.value !== '' && setRange(lo, Number(e.target.value))} className="field !border py-1 text-right" />
        </label>
        <span className="w-8 text-mute">{unit.symbol}</span>
      </div>
    </Section>
  );
}

function OptionFilter({ spec, value, onCommit }: { spec: SpecFacet; value?: string; onCommit: (v?: string) => void }) {
  const selected = new Set((value ?? '').split(',').filter(Boolean));
  const toggle = (option: string, on: boolean) => {
    const next = new Set(selected);
    if (on) next.add(option);
    else next.delete(option);
    onCommit(next.size ? [...next].join(',') : undefined);
  };
  return (
    <Section title={spec.label}>
      {(spec.options ?? []).map((o) => (
        <Check key={o.value} label={o.value} count={o.count} checked={selected.has(o.value)} onChange={(on) => toggle(o.value, on)} />
      ))}
    </Section>
  );
}
