import Link from 'next/link';

export function AdminNav({ current }: { current: 'dashboard' | 'orders' | 'products' }) {
  const links = [
    { key: 'dashboard', href: '/admin', label: 'Dashboard' },
    { key: 'orders', href: '/admin/orders', label: 'Orders' },
    { key: 'products', href: '/admin/products', label: 'Products & stock' },
  ] as const;
  return (
    <nav aria-label="Admin" className="mb-8 flex gap-6 border-b border-line text-[14px]">
      {links.map((l) => (
        <Link key={l.key} href={l.href} aria-current={l.key === current ? 'page' : undefined} className={l.key === current ? '-mb-px border-b-2 border-ink pb-3 font-medium' : 'pb-3 text-mute hover:text-ink'}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
