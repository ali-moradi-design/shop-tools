'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/shared/api/types';
import { clientApi } from '@/shared/api/client';

const field = 'mt-1 field aria-[invalid=true]:border-danger';
type Status = { kind: 'ok' | 'error'; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.kind === 'error' ? 'alert' : 'status'} className={status.kind === 'error' ? 'text-danger' : 'text-ink'}>
      {status.text}
    </p>
  );
}

/** Maps the API's `errors.fieldErrors` onto the form's fields. */
function applyFieldErrors<T extends string>(err: unknown, setError: (name: T, e: { message: string }) => void) {
  const fieldErrors = err instanceof ApiError ? (err.body as { errors?: { fieldErrors?: Record<string, string> } })?.errors?.fieldErrors : undefined;
  for (const [name, message] of Object.entries(fieldErrors ?? {})) setError(name as T, { message });
}

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(100),
  email: z.string().trim().email('Enter a valid email address'),
  currentPassword: z.string().max(128),
});
type ProfileValues = z.infer<typeof profileSchema>;

export function ProfileForm({ name, email, guest }: { name: string; email: string; guest: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const { register, handleSubmit, control, setError, reset, formState } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name, email, currentPassword: '' },
  });
  // the password field only shows when it is needed: for a new email
  const emailChanged = useWatch({ control, name: 'email' }).trim().toLowerCase() !== email;
  const submit = handleSubmit(async (values) => {
    setStatus(null);
    try {
      const body = { name: values.name, ...(emailChanged ? { email: values.email, currentPassword: values.currentPassword } : {}) };
      const { data } = await clientApi<{ data: { name: string; email: string } }>('/account', { method: 'PATCH', body: JSON.stringify(body) });
      reset({ name: data.name, email: data.email, currentPassword: '' });
      setStatus({ kind: 'ok', text: 'Saved.' });
      router.refresh();
    } catch (err) {
      applyFieldErrors<keyof ProfileValues>(err, setError);
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save' });
    }
  });
  const { errors } = formState;
  return (
    <form onSubmit={submit} noValidate className="space-y-4 text-[14px]" aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="heading text-[22px]">Profile</h2>
      <div>
        <label htmlFor="profile-name">Name</label>
        <input id="profile-name" autoComplete="name" {...register('name')} aria-invalid={errors.name ? true : undefined} className={field} />
        {errors.name && <p className="mt-1 text-[12px] text-danger">{errors.name.message}</p>}
      </div>
      <div>
        <label htmlFor="profile-email">Email</label>
        <input id="profile-email" type="email" autoComplete="email" {...register('email')} aria-invalid={errors.email ? true : undefined} className={field} />
        {errors.email && <p className="mt-1 text-[12px] text-danger">{errors.email.message}</p>}
      </div>
      {emailChanged && !guest && (
        <div>
          <label htmlFor="profile-current">Current password, to confirm the new email</label>
          <input id="profile-current" type="password" autoComplete="current-password" {...register('currentPassword')} aria-invalid={errors.currentPassword ? true : undefined} className={field} />
          {errors.currentPassword && <p className="mt-1 text-[12px] text-danger">{errors.currentPassword.message}</p>}
        </div>
      )}
      {emailChanged && guest && <p className="text-mute">Set a password first to change your email.</p>}
      <StatusLine status={status} />
      <button type="submit" disabled={formState.isSubmitting || !formState.isDirty || (emailChanged && guest)} className="btn">Save profile</button>
    </form>
  );
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'Use at least 8 characters').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'The passwords do not match' });
type PasswordValues = z.infer<typeof passwordSchema>;

export function PasswordForm() {
  const [status, setStatus] = useState<Status>(null);
  const { register, handleSubmit, setError, reset, formState } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setStatus(null);
    try {
      const res = await clientApi<{ message: string }>('/account/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
      reset();
      setStatus({ kind: 'ok', text: res.message });
    } catch (err) {
      applyFieldErrors<keyof PasswordValues>(err, setError);
      setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not change the password' });
    }
  });
  const { errors } = formState;
  const input = (name: keyof PasswordValues, label: string, autoComplete: string) => (
    <div>
      <label htmlFor={`pw-${name}`}>{label}</label>
      <input id={`pw-${name}`} type="password" autoComplete={autoComplete} {...register(name)} aria-invalid={errors[name] ? true : undefined} className={field} />
      {errors[name] && <p className="mt-1 text-[12px] text-danger">{errors[name]?.message}</p>}
    </div>
  );
  return (
    <form onSubmit={submit} noValidate className="space-y-4 text-[14px]" aria-labelledby="password-heading">
      <h2 id="password-heading" className="heading text-[22px]">Password</h2>
      {input('currentPassword', 'Current password', 'current-password')}
      {input('newPassword', 'New password', 'new-password')}
      {input('confirm', 'Repeat the new password', 'new-password')}
      <StatusLine status={status} />
      <button type="submit" disabled={formState.isSubmitting} className="btn">Change password</button>
    </form>
  );
}

/** Guests have no password yet; this emails them a link to set one. */
export function SetPasswordPrompt() {
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="border border-ink px-5 py-4 text-[14px]">
      <p className="font-medium">You checked out as a guest.</p>
      <p className="mt-1 text-mute">Set a password to sign in again later and keep your order history.</p>
      <button
        type="button"
        disabled={busy}
        className="btn mt-4"
        onClick={async () => {
          setBusy(true);
          try {
            const res = await clientApi<{ message: string }>('/account/set-password-link', { method: 'POST' });
            setStatus({ kind: 'ok', text: res.message });
          } catch (err) {
            setStatus({ kind: 'error', text: err instanceof Error ? err.message : 'Could not send the email' });
          } finally {
            setBusy(false);
          }
        }}
      >
        Email me a link
      </button>
      <div className="mt-3"><StatusLine status={status} /></div>
    </div>
  );
}
