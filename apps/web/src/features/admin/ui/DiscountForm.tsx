'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { createDiscount } from '../api/actions';
import { discountFormSchema, type DiscountFormValues } from '../model/discount-form';
import { ActionMessage } from './ActionMessage';
import { describe, Field, inputClass } from './Field';
import { useAction } from './useAction';

const EMPTY: DiscountFormValues = { code: '', type: 'percent', value: '', minOrderAmount: '', maxUses: '', endsAt: '' };

/** New discount code. */
export function DiscountForm() {
  const { pending, result, run } = useAction();
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: EMPTY,
    mode: 'onTouched',
  });
  const type = useWatch({ control, name: 'type' });

  const onSubmit = handleSubmit((values) =>
    run(
      () => createDiscount(values),
      (r) => {
        if (r.status === 'ok') reset(EMPTY);
        else for (const [path, message] of Object.entries(r.fieldErrors ?? {})) setError(path as FieldPath<DiscountFormValues>, { message });
      },
    ),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="panel grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
      <Field label="Code" htmlFor="code" error={errors.code?.message}>
        <input {...register('code')} {...describe('code', errors.code?.message)} placeholder="SPRING25" className={`${inputClass} uppercase`} />
      </Field>
      <Field label="Type" htmlFor="type">
        <select {...register('type')} id="type" className={inputClass}>
          <option value="percent">Percent off</option>
          <option value="fixed">Amount off (USD)</option>
        </select>
      </Field>
      <Field label={type === 'percent' ? 'Percent' : 'Amount (USD)'} htmlFor="value" error={errors.value?.message}>
        <input {...register('value')} {...describe('value', errors.value?.message)} inputMode="decimal" className={inputClass} />
      </Field>
      <Field label="Minimum order (USD, optional)" htmlFor="minOrderAmount" error={errors.minOrderAmount?.message}>
        <input {...register('minOrderAmount')} {...describe('minOrderAmount', errors.minOrderAmount?.message)} inputMode="decimal" className={inputClass} />
      </Field>
      <Field label="Max uses (optional)" htmlFor="maxUses" error={errors.maxUses?.message}>
        <input {...register('maxUses')} {...describe('maxUses', errors.maxUses?.message)} inputMode="numeric" className={inputClass} />
      </Field>
      <Field label="Ends on (optional)" htmlFor="endsAt" error={errors.endsAt?.message}>
        <input type="date" {...register('endsAt')} {...describe('endsAt', errors.endsAt?.message)} className={inputClass} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2 lg:col-span-3">
        <button type="submit" disabled={pending} className="btn">{pending ? 'Creating…' : 'Create code'}</button>
        <ActionMessage result={result} />
      </div>
    </form>
  );
}
