'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { SORTS } from '../model/params';

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 font-mono text-[12px]">
      SORT
      <select
        className="border border-ink bg-white px-2 py-1"
        value={params.get('sort') ?? 'featured'}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === 'featured') next.delete('sort');
          else next.set('sort', e.target.value);
          next.delete('page');
          const qs = next.toString();
          startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
        }}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </label>
  );
}
