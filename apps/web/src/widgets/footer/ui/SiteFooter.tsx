import Link from 'next/link';
import { COLLECTIONS, SITE } from '@/shared/config';

const columns = [
  { title: 'Shop', links: COLLECTIONS.map((c) => ({ href: `/collections/${c.slug}`, label: c.title })) },
  {
    title: 'About',
    links: [
      { href: '/about', label: 'Our Story' },
      { href: '/about#leather', label: 'Our Leathers' },
      { href: '/about#craft', label: 'Craft' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/help', label: 'FAQ' },
      { href: '/help#shipping', label: 'Shipping & Returns' },
      { href: '/help#sizing', label: 'Size Guide' },
      { href: '/account', label: 'My Account' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="container-page grid gap-10 py-14 text-[13.5px] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.6fr] lg:px-32">
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="mb-3 text-[14px]">{col.title}</h2>
            <ul className="space-y-1.5">
              {col.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link href={l.href} className="text-mute hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="text-[14px]">Sign Up For Early Access &amp; Exclusive Events</h2>
          <form action="/help" className="mt-5 flex border-b border-ink">
            <label htmlFor="newsletter" className="sr-only">Email address</label>
            <input id="newsletter" type="email" placeholder="Email address" className="min-w-0 flex-1 bg-transparent py-2.5 outline-none placeholder:text-mute" />
            <button type="submit" aria-label="Sign up">→</button>
          </form>
          <p className="mt-6 text-mute">
            © 2026 {SITE.legalName}. A demo shop — no real orders or payments.
          </p>
        </div>
      </div>
    </footer>
  );
}
