import type { Metadata } from 'next';
import { AdminNav } from '@/features/admin';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false, follow: false } };

/** Admin shell: the menu is static; each page checks the admin role next to its data. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page py-8 lg:grid lg:grid-cols-[180px_minmax(0,1fr)] lg:gap-10 lg:py-12">
      <aside className="lg:self-start">
        <p className="eyebrow mb-3 hidden text-mute lg:block">Admin</p>
        <AdminNav />
      </aside>
      <div className="min-w-0 pt-6 lg:pt-0">{children}</div>
    </div>
  );
}
