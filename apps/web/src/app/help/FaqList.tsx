'use client';

import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import type { FaqSection } from './faq';

/** The questions, grouped, with a filter box that searches questions and answers. */
export function FaqList({ sections }: { sections: FaqSection[] }) {
  const [query, setQuery] = useState('');
  // typing stays responsive; the list catches up a frame later
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const shown = useMemo(
    () =>
      deferred
        ? sections
            .map((s) => ({ ...s, items: s.items.filter((i) => `${i.q} ${i.a.join(' ')}`.toLowerCase().includes(deferred)) }))
            .filter((s) => s.items.length > 0)
        : sections,
    [sections, deferred],
  );
  const count = shown.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <div className="mt-8">
        <label htmlFor="faq-q" className="sr-only">Search the questions</label>
        <input
          id="faq-q"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search: returns, tracking, torque…"
          className="field py-3 text-[16px]"
        />
        <p aria-live="polite" className="mt-2 text-[13px] text-mute">
          {deferred ? `${count} answer${count === 1 ? '' : 's'}` : ''}
        </p>
      </div>
      {count === 0 && (
        <p className="mt-6 text-[15px]">
          Nothing matches “{query}”. <Link href="#contact" className="link-underline">Ask us instead</Link>.
        </p>
      )}
      {shown.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-h`} className="mt-10 scroll-mt-40">
          <h2 id={`${section.id}-h`} className="heading text-[26px]">{section.title}</h2>
          <div className="panel mt-3 divide-y divide-line-soft">
            {section.items.map((f) => (
              <details key={f.id} id={f.id} className="group scroll-mt-40 px-5 py-4" open={Boolean(deferred)}>
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[16px] font-medium text-ink">
                  {f.q}
                  <span aria-hidden className="mt-0.5 text-[20px] leading-none transition group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3 max-w-2xl space-y-3 text-[15px] leading-7 text-steel">
                  {f.a.map((p) => <p key={p}>{p}</p>)}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
