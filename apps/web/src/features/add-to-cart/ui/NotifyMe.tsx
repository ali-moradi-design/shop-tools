'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { ProductVariant } from '@/entities/product/model/types';
import { clientApi } from '@/shared/api/client';

const schema = z.object({
  sku: z.string().min(1, 'Choose an option'),
  email: z.string().trim().email('Enter a valid email address'),
});
type Values = z.infer<typeof schema>;

/** "Email me when it is back", for the sold-out options of a product. */
export function NotifyMe({ productId, soldOut, selected }: { productId: string; soldOut: ProductVariant[]; selected?: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preset = soldOut.find((v) => v.sku === selected)?.sku ?? (soldOut.length === 1 ? soldOut[0].sku : '');
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { sku: preset, email: '' } });
  if (soldOut.length === 0) return null;
  if (done) return <p role="status" className="text-[13px] font-medium">{done}</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-[13px] text-ink underline underline-offset-4">
        Sold out? Get an email when it is back
      </button>
    );
  }
  const submit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await clientApi<{ message: string }>(`/products/${productId}/stock-alerts`, { method: 'POST', body: JSON.stringify(values) });
      setDone(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    }
  });
  const { errors } = formState;
  return (
    <form onSubmit={submit} noValidate className="panel space-y-2 p-3 text-[13px]" aria-label="Back in stock alert">
      <div className="flex flex-wrap gap-2">
        {soldOut.length > 1 && (
          <>
            <label htmlFor={`${id}-option`} className="sr-only">Option</label>
            <select id={`${id}-option`} {...register('sku')} aria-invalid={errors.sku ? true : undefined} className="border-2 border-ink bg-paper px-2 py-2">
              <option value="">Option</option>
              {soldOut.map((v) => <option key={v.sku} value={v.sku}>{v.label}</option>)}
            </select>
          </>
        )}
        <label htmlFor={`${id}-email`} className="sr-only">Email</label>
        <input id={`${id}-email`} type="email" autoComplete="email" placeholder="Email address" {...register('email')} aria-invalid={errors.email ? true : undefined} className="min-w-0 flex-1 border-2 border-ink px-2 py-2" />
        <button type="submit" disabled={formState.isSubmitting} className="btn h-auto px-3 py-2 text-[12px]">Notify me</button>
      </div>
      {(errors.sku || errors.email || error) && <p role="alert" className="text-danger">{errors.sku?.message ?? errors.email?.message ?? error}</p>}
    </form>
  );
}
