import { z } from 'zod';

export interface SavedAddress {
  id: string;
  label?: string;
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface Account {
  id: string;
  name: string;
  email: string;
  guest: boolean;
  addresses: SavedAddress[];
}

const required = (label: string, max = 120) => z.string().trim().min(1, `Enter the ${label}`).max(max);

export const addressFormSchema = z.object({
  label: z.string().trim().max(40),
  fullName: required('full name'),
  line1: required('address', 200),
  line2: z.string().trim().max(200),
  city: required('city'),
  state: z.string().trim().max(120),
  postalCode: required('postal code', 20),
  country: required('country', 80),
  isDefault: z.boolean(),
});
export type AddressFormValues = z.infer<typeof addressFormSchema>;

/** Empty optional fields are left out, as the API expects. */
export function toAddressBody(v: AddressFormValues) {
  const { label, line2, state, ...rest } = v;
  return { ...rest, ...(label ? { label } : {}), ...(line2 ? { line2 } : {}), ...(state ? { state } : {}) };
}

export const formatAddress = (a: Pick<SavedAddress, 'line1' | 'line2' | 'city' | 'state' | 'postalCode' | 'country'>) =>
  [a.line1, a.line2, `${a.city}${a.state ? `, ${a.state}` : ''} ${a.postalCode}`, a.country].filter(Boolean).join(' · ');
