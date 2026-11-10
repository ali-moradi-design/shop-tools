'use client';

import { useState } from 'react';
import { formatMoney } from '@/shared/lib/money';

export interface DayPoint {
  /** YYYY-MM-DD */
  date: string;
  revenue: number;
  orders: number;
}

const W = 720;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 52 };
const day = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const label = (d: string) => day.format(new Date(`${d}T00:00:00Z`));

/** Clean y-axis steps: 1, 2 or 5 × 10ⁿ, about four lines. */
function niceScale(max: number) {
  if (max <= 0) return { top: 10_000, step: 2_500 };
  const raw = max / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return { top: Math.ceil(max / step) * step, step };
}

const compact = (cents: number) => {
  const d = cents / 100;
  return d >= 10_000 ? `$${Math.round(d / 1000)}K` : `$${d.toLocaleString('en-US')}`;
};

/** A column with a 4px rounded top and a square base on the baseline. */
function columnPath(x: number, base: number, w: number, h: number) {
  const r = Math.min(4, h, w / 2);
  return `M${x},${base} v${-(h - r)} q0,${-r} ${r},${-r} h${w - 2 * r} q${r},0 ${r},${r} v${h - r} z`;
}

/**
 * Daily paid revenue as columns (one series, so no legend; the heading names it).
 * Hover a day for its numbers; a hidden table carries the same data for screen
 * readers and keyboard users.
 */
export function RevenueChart({ points }: { points: DayPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const { top, step } = niceScale(Math.max(...points.map((p) => p.revenue)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const band = innerW / points.length;
  const barW = Math.min(18, band - 2);
  const y = (v: number) => PAD.top + innerH - (v / top) * innerH;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const hovered = active === null ? null : points[active];
  const tipAt = active === null ? 0 : ((PAD.left + (active + 0.5) * band) / W) * 100;

  return (
    <figure className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Paid revenue per day, last 30 days"
        onMouseLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--color-mute)">
              {compact(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const h = Math.max(0, y(0) - y(p.revenue));
          return (
            <g key={p.date}>
              {h > 0 && (
                <path
                  d={columnPath(PAD.left + i * band + (band - barW) / 2, y(0), barW, h)}
                  fill="var(--color-ink)"
                  opacity={active === null || active === i ? 1 : 0.45}
                />
              )}
              {/* the hit area is the whole day column, wider than the bar */}
              <rect
                x={PAD.left + i * band}
                y={PAD.top}
                width={band}
                height={innerH}
                fill="transparent"
                aria-hidden
                onMouseEnter={() => setActive(i)}
              />
              {(i === points.length - 1 || (i % 7 === 0 && i < points.length - 4)) && (
                <text x={PAD.left + i * band + band / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--color-mute)">
                  {label(p.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hovered && active !== null && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 whitespace-nowrap border-2 border-ink bg-paper px-3 py-2 text-[12px]"
          // shifted by the same share as its position, so it never runs off either edge
          style={{ left: `${tipAt}%`, transform: `translateX(-${tipAt}%)` }}
        >
          <div className="text-mute">{label(hovered.date)}</div>
          <div className="text-[14px] font-semibold text-ink">{formatMoney(hovered.revenue)}</div>
          <div className="text-mute">
            {hovered.orders} {hovered.orders === 1 ? 'order' : 'orders'}
          </div>
        </div>
      )}
      <table className="sr-only">
        <caption>Paid revenue per day</caption>
        <thead>
          <tr><th>Day</th><th>Revenue</th><th>Orders</th></tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}><td>{label(p.date)}</td><td>{formatMoney(p.revenue)}</td><td>{p.orders}</td></tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
