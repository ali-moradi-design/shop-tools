'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { clientApi } from '@/shared/api/client';
import { safeNext } from './AuthForm';

const field = 'mt-1 field aria-[invalid=true]:border-danger';
const email = z.string().trim().min(1, 'Enter your email').email('Enter a valid email address');
const newPassword = z.string().min(8, 'Use at least 8 characters').max(128);

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-[12px] text-danger">{message}</p> : null;
}

/** Asks for a reset link. The answer is the same for unknown emails, like the API's. */
export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email })),
    defaultValues: { email: '' },
  });
  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await clientApi('/auth/forgot-password', { method: 'POST', body: JSON.stringify(values) });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  });
  if (sent) {
    return (
      <p role="status" className="mt-8 text-[15px]">
        If an account uses that email, a link to reset the password is on its way. It works for one hour.
      </p>
    );
  }
  const err = formState.errors.email?.message;
  return (
    <form onSubmit={submit} noValidate className="mt-8 space-y-4 text-[14px]">
      <div>
        <label htmlFor="forgot-email">Email</label>
        <input id="forgot-email" type="email" autoComplete="email" {...register('email')} aria-invalid={err ? true : undefined} aria-describedby={err ? 'forgot-email-error' : undefined} className={field} />
        <FieldError id="forgot-email-error" message={err} />
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <button type="submit" disabled={formState.isSubmitting} className="btn w-full">Email me a link</button>
    </form>
  );
}

const resetSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'The passwords do not match' });

/** Sets a new password from the emailed link. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirm: '' },
  });
  const submit = handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await clientApi('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  });
  if (done) {
    return (
      <div role="status" className="mt-8 text-[15px]">
        <p>Your password is set. Other devices were signed out.</p>
        <Link href="/account/login" className="btn mt-6 w-full">Sign in</Link>
      </div>
    );
  }
  const { errors } = formState;
  return (
    <form onSubmit={submit} noValidate className="mt-8 space-y-4 text-[14px]">
      <div>
        <label htmlFor="reset-password">New password</label>
        <input id="reset-password" type="password" autoComplete="new-password" {...register('password')} aria-invalid={errors.password ? true : undefined} aria-describedby={errors.password ? 'reset-password-error' : undefined} className={field} />
        <FieldError id="reset-password-error" message={errors.password?.message} />
      </div>
      <div>
        <label htmlFor="reset-confirm">Repeat it</label>
        <input id="reset-confirm" type="password" autoComplete="new-password" {...register('confirm')} aria-invalid={errors.confirm ? true : undefined} aria-describedby={errors.confirm ? 'reset-confirm-error' : undefined} className={field} />
        <FieldError id="reset-confirm-error" message={errors.confirm?.message} />
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error} <Link href="/account/forgot-password" className="link-underline">Get a new link</Link>
        </p>
      )}
      <button type="submit" disabled={formState.isSubmitting} className="btn w-full">Save password</button>
    </form>
  );
}

const guestSchema = z.object({ name: z.string().trim().min(2, 'Enter your name').max(100), email });

/**
 * Checkout without an account: the API makes a passwordless account and signs
 * the visitor in, so the order, payment and order page work as for anyone else.
 */
export function GuestCheckoutForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<z.infer<typeof guestSchema>>({
    resolver: zodResolver(guestSchema),
    defaultValues: { name: '', email: '' },
    mode: 'onTouched',
  });
  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      await clientApi('/auth/guest', { method: 'POST', body: JSON.stringify(values) });
      await clientApi('/cart/merge', { method: 'POST' }).catch(() => {});
      window.location.replace(safeNext(next ?? '/checkout'));
      await new Promise(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  });
  const { errors } = formState;
  return (
    <section aria-labelledby="guest-heading" className="mx-auto max-w-md border-t-2 border-ink px-4 pb-16 pt-10">
      <h2 id="guest-heading" className="heading text-center text-[24px]">New customer?</h2>
      <p className="mt-2 text-center text-[14px] text-mute">Check out as a guest. We will email you a link to set a password later, if you want one.</p>
      <form onSubmit={submit} noValidate className="mt-6 space-y-4 text-[14px]">
        <div>
          <label htmlFor="guest-name">Name</label>
          <input id="guest-name" autoComplete="name" {...register('name')} aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'guest-name-error' : undefined} className={field} />
          <FieldError id="guest-name-error" message={errors.name?.message} />
        </div>
        <div>
          <label htmlFor="guest-email">Email for your receipt</label>
          <input id="guest-email" type="email" autoComplete="email" {...register('email')} aria-invalid={errors.email ? true : undefined} aria-describedby={errors.email ? 'guest-email-error' : undefined} className={field} />
          <FieldError id="guest-email-error" message={errors.email?.message} />
        </div>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <button type="submit" disabled={formState.isSubmitting} className="btn btn-outline w-full">Continue as guest</button>
      </form>
    </section>
  );
}
