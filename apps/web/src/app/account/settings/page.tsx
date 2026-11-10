import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AddressBook, PasswordForm, ProfileForm, SetPasswordPrompt } from '@/features/account';
import { requireAccount } from '@/features/auth/server';
import { Skeleton } from '@/shared/ui';

export const metadata: Metadata = { title: 'Account Settings' };

async function Settings() {
  const account = await requireAccount('/account/settings');
  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div className="space-y-12">
        <ProfileForm name={account.name} email={account.email} guest={account.guest} />
        {account.guest ? <SetPasswordPrompt /> : <PasswordForm />}
      </div>
      <AddressBook initial={account.addresses} />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="container-page py-14">
      <Link href="/account" className="text-[13px] text-mute underline">← My account</Link>
      <h1 className="heading mb-10 mt-3 text-[32px]">Settings</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Settings />
      </Suspense>
    </div>
  );
}
