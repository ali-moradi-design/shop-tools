import Link from 'next/link';

/**
 * Horizontal bars for a short ranked list (one series): the label on the left,
 * the value at the bar's tip. Plain HTML, no JavaScript.
 */
export function BarList({
  items,
  format = String,
}: {
  items: { label: string; value: number; href?: string }[];
  format?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5 text-[13px]">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[minmax(0,150px)_1fr] items-center gap-3">
          {item.href ? (
            <Link href={item.href} className="truncate text-ink hover:underline" title={item.label}>{item.label}</Link>
          ) : (
            <span className="truncate text-ink" title={item.label}>{item.label}</span>
          )}
          <span className="flex items-center gap-2">
            <span
              className="h-3.5 bg-ink"
              style={{ width: `${(item.value / max) * 80}%`, minWidth: item.value ? 3 : 0 }}
            />
            <span className="whitespace-nowrap text-mute">{format(item.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
