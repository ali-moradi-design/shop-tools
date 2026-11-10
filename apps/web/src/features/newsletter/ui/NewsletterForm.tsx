'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { clientApi } from '@/shared/api/client';

const schema = z.object({ email: z.string().trim().email('Enter a valid email address') });
type Values = z.infer<typeof schema>;

/** Footer sign-up (dark band); the API adds the address and sends a welcome email with an unsubscribe link. */
export function NewsletterForm({ className }: { className?: string }) {
  const id = useId();
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });
  const subscribe = handleSubmit(async ({ email }) => {
    setFailed(null);
    try {
      await clientApi('/newsletter', { method: 'POST', body: JSON.stringify({ email, source: 'footer' }) });
      setDone(true);
    } catch (err) {
      setFailed(err instanceof Error ? err.message : 'Could not sign you up. Try again.');
    }
  });

  if (done) return <p role="status" className={`text-[14px] text-white ${className ?? ''}`}>Thanks, you are on the list.</p>;

  return (
    <form className={className} noValidate onSubmit={subscribe}>
      <label htmlFor={`${id}-email`} className="mb-1.5 block text-white">New tools, restocks and deals, about once a month</label>
      <div className="flex">
        <input
          id={`${id}-email`}
          type="email"
          {...register('email')}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${id}-error` : undefined}
          autoComplete="email"
          placeholder="Email address"
          className="h-10 min-w-0 flex-1 border-2 border-r-0 border-white bg-paper px-3 text-[14px] text-ink outline-none placeholder:text-mute"
        />
        <button type="submit" disabled={isSubmitting} className="btn h-10 shrink-0 border-white px-4 text-[13px]">
          Subscribe
        </button>
      </div>
      {errors.email && <p id={`${id}-error`} className="mt-1.5 text-[13px] text-accent">{errors.email.message}</p>}
      {failed && <p role="alert" className="mt-1.5 text-[13px] text-accent">{failed}</p>}
    </form>
  );
}
