import type { Metadata } from 'next';
import Link from 'next/link';
import { FAQ } from './faq';
import { FaqList } from './FaqList';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'Orders, shipping, returns, specifications and stock at Toolbench Supply Co.',
};

const SHORTCUTS = [
  ['Track an order', '/account', 'The order page has the tracking link'],
  ['Return a tool', '/help#how-to-return', 'Free within 30 days'],
  ['Filter by specs', '/help#filters', 'Ranges in the unit you think in'],
  ['Get a restock email', '/help#back-in-stock', 'For sold-out tools'],
] as const;

export default function HelpPage() {
  return (
    <div className="container-page py-14 lg:py-20">
      <header className="max-w-3xl">
        <p className="eyebrow text-mute">Help</p>
        <h1 className="heading mt-2 text-[40px] leading-none sm:text-[48px]">How can we help?</h1>
        <p className="mt-3 text-[17px] leading-8 text-steel">Answers about orders, shipping, returns, specifications and stock.</p>
      </header>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map(([title, href, note]) => (
          <li key={title}>
            <Link href={href} className="panel block h-full p-5 transition-colors hover:border-ink">
              <span className="block font-display text-[18px] font-bold uppercase tracking-[0.04em] text-ink">{title} →</span>
              <span className="mt-1 block text-[13px] text-mute">{note}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Topics" className="hidden lg:block">
          <ul className="sticky top-6 mt-10 space-y-2 text-[14px]">
            {FAQ.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-mute hover:text-ink">{s.title}</a>
              </li>
            ))}
            <li><a href="#contact" className="text-mute hover:text-ink">Contact us</a></li>
          </ul>
        </nav>
        <div className="max-w-3xl">
          <FaqList sections={FAQ} />
          {/* headings on dark bands set their own colour: .heading would make them ink (axe caught this in leather-shop) */}
          <section id="contact" aria-labelledby="contact-h" className="mt-14 scroll-mt-40 bg-ink p-8 text-white">
            <h2 id="contact-h" className="heading text-[26px] text-white">Still have a question?</h2>
            <p className="mt-2 text-[15px] leading-7 text-[#c9ced3]">This is a demo shop, so nobody answers, but this is where the help desk would be.</p>
            <dl className="mt-6 grid gap-6 text-[15px] sm:grid-cols-2">
              <div>
                <dt className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">Email</dt>
                <dd className="mt-1">help@toolbench.example</dd>
              </div>
              <div>
                <dt className="font-mono text-[12px] uppercase tracking-[0.16em] text-accent">Hours</dt>
                <dd className="mt-1">Mon–Fri, 8:00–17:00 CET</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
