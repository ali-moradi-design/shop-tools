import { z } from 'zod';

const digits = (v: string) => v.replace(/\D/g, '');

/** The simulated card form: shape only; the API decides which test cards pay. */
export const cardSchema = z.object({
  card: z.string().refine((v) => /^\d{16}$/.test(digits(v)), 'Enter the 16 card digits'),
  expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/, 'Use MM / YY'),
  cvc: z.string().trim().regex(/^\d{3,4}$/, '3 or 4 digits'),
});

export type CardValues = z.infer<typeof cardSchema>;
