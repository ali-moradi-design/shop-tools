'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { clientApi } from '@/shared/api/client';
import { addressFormSchema, formatAddress, toAddressBody, type AddressFormValues, type SavedAddress } from '../model/types';

const field = 'mt-1 field aria-[invalid=true]:border-danger';
const EMPTY: AddressFormValues = { label: '', fullName: '', line1: '', line2: '', city: '', state: '', postalCode: '', country: 'United States', isDefault: false };

/** Saved addresses: the default one fills in the checkout form. */
export function AddressBook({ initial }: { initial: SavedAddress[] }) {
  const [addresses, setAddresses] = useState(initial);
  // null: closed; 'new': adding; an id: editing that address
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown) => {
    setError(null);
    try {
      const { data } = await clientApi<{ data: SavedAddress[] }>(path, { method, body: body ? JSON.stringify(body) : undefined });
      setAddresses(data);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  const current = editing && editing !== 'new' ? addresses.find((a) => a.id === editing) : undefined;
  return (
    <section aria-labelledby="addresses-heading" className="text-[14px]">
      <div className="flex items-center justify-between">
        <h2 id="addresses-heading" className="heading text-[22px]">Addresses</h2>
        {editing === null && addresses.length < 10 && (
          <button type="button" className="link-underline" onClick={() => setEditing('new')}>Add an address</button>
        )}
      </div>
      {addresses.length === 0 && editing === null && <p className="mt-3 text-mute">No saved addresses yet. You can also save one at checkout.</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="panel p-4" data-testid="saved-address">
            <p className="font-medium">
              {a.label || a.fullName}
              {a.isDefault && <span className="tag tag-accent ml-2">Default</span>}
            </p>
            {a.label && <p>{a.fullName}</p>}
            <p className="text-mute">{formatAddress(a)}</p>
            <div className="mt-3 flex gap-4 text-[13px]">
              <button type="button" className="underline underline-offset-4" onClick={() => setEditing(a.id)}>Edit</button>
              {!a.isDefault && (
                <button type="button" className="underline underline-offset-4" onClick={() => call(`/account/addresses/${a.id}`, 'PUT', toAddressBody({ ...EMPTY, ...a, label: a.label ?? '', line2: a.line2 ?? '', state: a.state ?? '', isDefault: true }))}>
                  Make default
                </button>
              )}
              <button
                type="button"
                className="text-danger underline underline-offset-4"
                onClick={() => window.confirm('Remove this address?') && call(`/account/addresses/${a.id}`, 'DELETE')}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      {editing !== null && (
        <AddressForm
          key={editing}
          initial={current ? { ...EMPTY, ...current, label: current.label ?? '', line2: current.line2 ?? '', state: current.state ?? '' } : { ...EMPTY, isDefault: addresses.length === 0 }}
          onCancel={() => setEditing(null)}
          onSave={(values) =>
            current ? call(`/account/addresses/${current.id}`, 'PUT', toAddressBody(values)) : call('/account/addresses', 'POST', toAddressBody(values))
          }
        />
      )}
    </section>
  );
}

function AddressForm({ initial, onSave, onCancel }: { initial: AddressFormValues; onSave: (v: AddressFormValues) => Promise<void>; onCancel: () => void }) {
  const { register, handleSubmit, formState } = useForm<AddressFormValues>({ resolver: zodResolver(addressFormSchema), defaultValues: initial });
  const { errors } = formState;
  const input = (name: Exclude<keyof AddressFormValues, 'isDefault'>, label: string, autoComplete: string, wide = false) => (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <label htmlFor={`addr-${name}`}>{label}</label>
      <input id={`addr-${name}`} autoComplete={autoComplete} {...register(name)} aria-invalid={errors[name] ? true : undefined} className={field} />
      {errors[name] && <p className="mt-1 text-[12px] text-danger">{errors[name]?.message}</p>}
    </div>
  );
  return (
    <form onSubmit={handleSubmit(onSave)} noValidate className="panel mt-6 grid gap-4 p-5 sm:grid-cols-2">
      {input('label', 'Label (optional, e.g. Home)', 'off')}
      {input('fullName', 'Full name', 'name')}
      {input('line1', 'Address', 'address-line1', true)}
      {input('line2', 'Apartment, suite (optional)', 'address-line2', true)}
      {input('city', 'City', 'address-level2')}
      {input('state', 'State / region (optional)', 'address-level1')}
      {input('postalCode', 'Postal code', 'postal-code')}
      {input('country', 'Country', 'country-name')}
      <label className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" {...register('isDefault')} className="h-4 w-4" /> Use as my default address
      </label>
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={formState.isSubmitting} className="btn">Save address</button>
        <button type="button" onClick={onCancel} className="btn btn-outline">Cancel</button>
      </div>
    </form>
  );
}
