'use client';

import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { cn } from '@/shared/lib/cn';

const LINKS = [
  { segment: null, href: '/admin', label: 'Dashboard' },
  { segment: 'products', href: '/admin/products', label: 'Products' },
  { segment: 'orders', href: '/admin/orders', label: 'Orders' },
  { segment: 'discounts', href: '/admin/discounts', label: 'Discounts' },
  { segment: 'customers', href: '/admin/customers', label: 'Customers' },
  { segment: 'reviews', href: '/admin/reviews', label: 'Reviews' },
  { segment: 'emails', href: '/admin/emails', label: 'Emails' },
] as const;

/** Side menu on desktop, a scrolling strip on phones; the current section is marked. */
export function AdminNav() {
  const segment = useSelectedLayoutSegment();
  return (
    <nav aria-label="Admin" className="-mx-4 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0 lg:overflow-visible lg:border-0">
      <ul className="flex gap-6 text-[14px] lg:flex-col lg:gap-1">
        {LINKS.map((l) => {
          const current = l.segment === segment;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={current ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap pb-3 pt-1 lg:border-l-4 lg:py-2 lg:pl-4',
                  current
                    ? '-mb-px border-b-4 border-accent font-semibold text-ink lg:mb-0 lg:border-b-0 lg:border-l-accent'
                    : 'text-mute hover:text-ink lg:border-l-transparent',
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
        <li className="lg:mt-6">
          <Link href="/" className="block whitespace-nowrap pb-3 pt-1 text-mute hover:text-ink lg:py-2 lg:pl-4">View shop ↗</Link>
        </li>
      </ul>
    </nav>
  );
}
