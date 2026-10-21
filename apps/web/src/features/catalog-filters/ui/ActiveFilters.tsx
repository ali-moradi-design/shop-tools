import Link from 'next/link';
import type { ProductFacets } from '@/entities/product/model/types';
import { parseRangeParam, type FilterParams } from '../model/params';

/** The filters in use, each as a chip that removes it (plain links: no JavaScript needed). */
export function ActiveFilters({ params, facets, basePath }: { params: FilterParams; facets: ProductFacets; basePath: string }) {
  const chips: { key: string; label: string }[] = [];
  if (params.q) chips.push({ key: 'q', label: `Search: ${params.q}` });
  if (params.instock === '1') chips.push({ key: 'instock', label: 'In stock' });
  if (params.warehouse) chips.push({ key: 'warehouse', label: `Warehouse: ${facets.warehouses.find((w) => w.code === params.warehouse)?.name ?? params.warehouse}` });
  if (params.price) chips.push({ key: 'price', label: `Price: $${params.price.replace('..', '–')}` });
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith('spec.')) continue;
    const spec = facets.specs.find((s) => `spec.${s.key}` === key);
    if (!spec) continue;
    if (spec.kind === 'number') {
      const { lo, hi, unit } = parseRangeParam(value);
      const u = unit ?? spec.unit ?? '';
      const text = lo !== undefined && hi !== undefined ? `${lo}–${hi}` : lo !== undefined ? `≥ ${lo}` : `≤ ${hi}`;
      chips.push({ key, label: `${spec.label}: ${text} ${u}`.trim() });
    } else {
      chips.push({ key, label: `${spec.label}: ${value.split(',').join(', ')}` });
    }
  }
  if (chips.length === 0) return null;

  const without = (drop?: string) => {
    const sp = new URLSearchParams(params);
    if (drop) sp.delete(drop);
    else for (const k of [...sp.keys()]) if (k !== 'sort') sp.delete(k);
    sp.delete('page');
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <ul className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters" data-testid="active-filters">
      {chips.map((c) => (
        <li key={c.key}>
          <Link href={without(c.key)} className="inline-flex items-center gap-1.5 bg-ink px-2.5 py-1 font-mono text-[12px] text-white hover:bg-steel" aria-label={`Remove filter ${c.label}`}>
            {c.label} <span aria-hidden>✕</span>
          </Link>
        </li>
      ))}
      <li><Link href={without()} className="ml-1 font-mono text-[12px] underline">Clear all</Link></li>
    </ul>
  );
}
