'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { Comparison } from '@/entities/product/model/types';
import { StockLine } from '@/entities/product/ui/StockLine';
import { cn } from '@/shared/lib/cn';
import { formatMoney } from '@/shared/lib/money';
import { formatQuantity, type UnitSystem } from '@/shared/lib/units';

/** Side-by-side table: products as columns, specifications as rows, best value highlighted. */
export function CompareTable({ comparison }: { comparison: Comparison }) {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const [diffOnly, setDiffOnly] = useState(false);
  const { products, rows, warehouses } = comparison;
  const slugs = products.map((p) => p.slug);

  const visible = useMemo(() => (diffOnly ? rows.filter((r) => !r.same) : rows), [rows, diffOnly]);
  const groups = [...new Set(visible.map((r) => r.group))];
  const cols = products.length;
  const cell = 'border-t border-r border-line-soft px-4 py-2.5';
  const hasUnits = rows.some((r) => r.units.length > 1);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <h1 className="heading text-[54px] leading-none">Compare tools</h1>
        <span className="mb-2 font-mono text-[13px] text-mute">{cols} / 4 · {comparison.category.name}</span>
        <span className="flex-1" />
        <label className="mb-2 flex items-center gap-2 font-mono text-[12px]">
          <input type="checkbox" checked={diffOnly} onChange={(e) => setDiffOnly(e.target.checked)} className="h-4 w-4 accent-[#ffc20e]" />
          Show differences only
        </label>
        {hasUnits && (
          <div role="group" aria-label="Units" className="mb-2 flex border border-ink font-mono text-[11px]">
            {(['metric', 'imperial'] as const).map((s) => (
              <button key={s} type="button" aria-pressed={system === s} onClick={() => setSystem(s)} className={cn('px-2.5 py-1 uppercase', system === s && 'bg-ink text-white')}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-[14px]" data-testid="compare-table">
          <thead>
            <tr>
              <td className="w-[200px] border-r border-line-soft px-4 align-bottom font-mono text-[11px] text-mute">SPECIFICATION</td>
              {products.map((p) => (
                <th key={p.slug} scope="col" className="border-r border-line-soft p-4 text-left align-top font-normal">
                  <div className="relative mb-2 h-[130px]">
                    {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="25vw" className="object-contain mix-blend-multiply" />}
                  </div>
                  <div className="font-mono text-[11px] text-mute">{p.model ?? p.slug}</div>
                  <Link href={`/products/${p.slug}`} className="font-semibold hover:underline">{p.title}</Link>
                  <div className="mt-1.5 flex items-center">
                    <span className="font-display text-[24px] font-bold">{formatMoney(p.price, p.currency)}</span>
                    <span className="flex-1" />
                    {cols > 2 && (
                      <Link
                        href={`/compare?slugs=${slugs.filter((s) => s !== p.slug).join(',')}`}
                        className="font-mono text-[11px] text-mute hover:text-ink"
                        aria-label={`Remove ${p.title} from the comparison`}
                      >
                        REMOVE ✕
                      </Link>
                    )}
                  </div>
                  <Link href={`/products/${p.slug}`} className="btn mt-2 h-9 w-full text-[13px]">Choose option</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <GroupRows key={group} title={group} cols={cols}>
                {visible
                  .filter((r) => r.group === group)
                  .map((r) => (
                    <tr key={r.key} data-row={r.key}>
                      <th scope="row" className={cn(cell, 'text-left font-normal text-steel')}>{r.label}</th>
                      {r.values.map((v, i) => (
                        <td
                          key={products[i].slug}
                          className={cn(cell, 'font-mono font-semibold', r.best[i] && 'bg-[#fff3c4]')}
                          data-best={r.best[i] ? 'true' : undefined}
                        >
                          {v === null ? '—' : r.kind === 'number' ? formatQuantity(Number(v), r.units, system, r.unit) : v}
                          {r.best[i] && <span className="ml-2 bg-ink px-1.5 py-px font-mono text-[10px] text-accent">BEST</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
              </GroupRows>
            ))}
            <GroupRows title="Stock" cols={cols}>
              {warehouses.map((w) => (
                <tr key={w.code}>
                  <th scope="row" className={cn(cell, 'text-left font-normal text-steel')}>{w.name}</th>
                  {products.map((p) => {
                    const q = p.warehouses.find((x) => x.warehouse === w.code)?.quantity ?? 0;
                    return (
                      <td key={p.slug} className={cn(cell, 'font-mono font-semibold')}>
                        {q}
                        {q === 0 && <span className="dot dot-out ml-2" aria-label="out of stock" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <th scope="row" className={cn(cell, 'text-left font-normal text-steel')}>Availability</th>
                {products.map((p) => (
                  <td key={p.slug} className={cell}><StockLine product={p} className="text-[12px]" /></td>
                ))}
              </tr>
            </GroupRows>
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[12px] text-steel">
        ▪ Yellow cells mark the best value in a row (higher torque, lower weight …). The unit switch changes how numbers are shown.
      </p>
    </div>
  );
}

function GroupRows({ title, cols, children }: { title: string; cols: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <th colSpan={cols + 1} scope="colgroup" className="bg-ink px-4 py-1.5 text-left font-display text-[16px] font-bold uppercase tracking-[0.1em] text-accent">
          {title}
        </th>
      </tr>
      {children}
    </>
  );
}
