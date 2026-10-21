import Image from 'next/image';
import Link from 'next/link';

export interface SplitTile {
  image: string;
  alt: string;
  title: string;
  href: string;
  links?: { href: string; label: string }[];
}

/** Two large lifestyle tiles side by side, title bottom-left. */
export function Split({ tiles, className }: { tiles: [SplitTile, SplitTile]; className?: string }) {
  return (
    <section className={`grid gap-1.5 sm:grid-cols-2 ${className ?? ''}`}>
      {tiles.map((t) => (
        <div key={t.title} className="relative h-[420px] text-white sm:h-[650px]">
          <Link href={t.href} aria-label={t.title} className="absolute inset-0">
            <Image src={t.image} alt={t.alt} fill sizes="(min-width: 640px) 50vw, 100vw" className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent to-40%" />
          </Link>
          <div className="pointer-events-none absolute bottom-6 left-6">
            <h2 className="heading text-[30px]">{t.title}</h2>
            {t.links && (
              <div className="pointer-events-auto mt-1 flex gap-6 text-[11px] font-medium tracking-[0.14em]">
                {t.links.map((l) => (
                  <Link key={l.href} href={l.href} className="underline underline-offset-4">{l.label}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
