'use client';

import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { formatQuantity, type UnitSystem, type UnitOption } from '@/shared/lib/units';
import type { Product } from '../model/types';

/** Groups the specs by their heading ("Performance", "Battery" ...) and lets the shopper switch units. */
export function SpecTable({ specs, unitsByKey }: { specs: Product['specs']; unitsByKey: Record<string, UnitOption[]> }) {
  const [system, setSystem] = useState<UnitSystem>('metric');
  const groups = [...new Set(specs.map((s) => s.group))];
  const hasUnits = specs.some((s) => (unitsByKey[s.key]?.length ?? 0) > 1);

  return (
    <div>
      <div className="mb-3 flex items-center">
        <h2 className="heading text-[30px]">Technical specifications</h2>
        <span className="flex-1" />
        {hasUnits && (
          <div role="group" aria-label="Units" className="flex border border-ink font-mono text-[11px]">
            {(['metric', 'imperial'] as const).map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={system === s}
                onClick={() => setSystem(s)}
                className={cn('px-2.5 py-1 uppercase', system === s && 'bg-ink text-white')}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <table className="panel w-full border-collapse text-[14px]" data-testid="spec-table">
        {groups.map((group) => (
          <tbody key={group}>
            <tr>
              <th colSpan={2} className="bg-ink px-4 py-2 text-left font-display text-[16px] font-bold uppercase tracking-[0.1em] text-accent">
                {group}
              </th>
            </tr>
            {specs
              .filter((s) => s.group === group)
              .map((s, i) => (
                <tr key={s.key} className={i % 2 ? 'bg-soft' : 'bg-white'}>
                  <td className="w-[42%] px-4 py-2.5 text-steel">{s.label}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold" data-spec={s.key}>
                    {s.kind === 'number'
                      ? formatQuantity(Number(s.value), unitsByKey[s.key] ?? [], system, s.unit)
                      : s.value}
                  </td>
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
