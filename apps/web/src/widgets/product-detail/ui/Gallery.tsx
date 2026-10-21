'use client';

import Image from 'next/image';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';

/** Large photo and a row of thumbnails (one photo per product in the demo, so the row hides itself). */
export function Gallery({ images, title, badge }: { images: string[]; title: string; badge?: string }) {
  const [index, setIndex] = useState(0);
  const current = images[index] ?? images[0];
  return (
    <div>
      <div className="panel relative h-[420px] bg-white sm:h-[560px]">
        {current && <Image src={current} alt={title} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-contain p-4 mix-blend-multiply" />}
        {badge && <span className="tag tag-accent absolute left-3.5 top-3.5">{badge}</span>}
      </div>
      {images.length > 1 && (
        <ul className="mt-2.5 grid grid-cols-5 gap-2.5">
          {images.slice(0, 5).map((src, i) => (
            <li key={src}>
              <button type="button" onClick={() => setIndex(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === index} className={cn('panel relative block h-24 w-full', i === index && 'border-2 border-ink')}>
                <Image src={src} alt="" fill sizes="120px" className="object-contain p-1 mix-blend-multiply" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
