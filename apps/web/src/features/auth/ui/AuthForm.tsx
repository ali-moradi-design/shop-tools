'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCart } from '@/features/cart';
import { clientApi } from '@/shared/api/client';

export const DEMO = { email: 'demo@shop-tools.local', password: 'Demo123!' };

/** Only same-site paths: no "//host", no "/\\host" (browsers read both as another host). */
export function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return '/account';
  try {
    const url = new URL(next, 'http://local.invalid');
    return url.origin === 'http://local.invalid' ? url.pathname + url.search + url.hash : '/account';
  } catch {
    return '/account';
  }
}

/** Sign in / create account. After success the guest cart is merged into the account. */
export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next?: string }) {
  const router = useRouter();
  const { refresh } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = safeNext(next);

  const finish = async () => {
    await clientApi('/cart/merge', { method: 'POST' }).catch(() => {});
    await refresh();
    router.replace(target);
    router.refresh();
  };

  // A still-valid refresh cookie signs the visitor back in without the form.
  useEffect(() => {
    if (mode !== 'login') return;
    let alive = true;
    clientApi('/auth/refresh', { method: 'POST' })
      .then(() => {
        if (alive) void finish();
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (values: Record<string, string>) => {
    setBusy(true);
    setError(null);
    try {
      await clientApi(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(values) });
      await finish();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void submit(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
  };

  const field = 'mt-1 block w-full border border-line px-3 py-2.5 outline-none focus:border-ink';
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="heading text-center text-[32px]">{mode === 'login' ? 'Sign In' : 'Create Account'}</h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate={false}>
        {mode === 'register' && (
          <label className="block text-[14px]">
            Name
            <input name="name" required autoComplete="name" className={field} />
          </label>
        )}
        <label className="block text-[14px]">
          Email
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
        <label className="block text-[14px]">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            className={field}
          />
        </label>
        {error && <p role="alert" className="text-[14px] text-danger">{error}</p>}
        <button type="submit" disabled={busy} className="btn w-full">
          {mode === 'login' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      {mode === 'login' && (
        <button type="button" disabled={busy} onClick={() => submit(DEMO)} className="btn btn-outline mt-3 w-full">
          Use the demo account
        </button>
      )}
      <p className="mt-6 text-center text-[14px] text-mute">
        {mode === 'login' ? (
          <>New here? <Link className="link-underline text-ink" href={`/account/register?next=${encodeURIComponent(target)}`}>Create an account</Link></>
        ) : (
          <>Already have an account? <Link className="link-underline text-ink" href={`/account/login?next=${encodeURIComponent(target)}`}>Sign in</Link></>
        )}
      </p>
    </div>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const { refresh } = useCart();
  return (
    <button
      type="button"
      className="link-underline text-[14px]"
      onClick={async () => {
        await clientApi('/auth/logout', { method: 'POST' }).catch(() => {});
        await refresh();
        router.replace('/');
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
