import { z } from 'zod';

const money = z.string().trim().regex(/^\d{1,6}(\.\d{1,2})?$/, 'Enter an amount like 129.00');

/** Discount code form. Fixed amounts are typed in dollars. */
export const discountFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,50}$/, 'Use 3–50 letters, digits, dashes or underscores'),
    type: z.enum(['percent', 'fixed']),
    value: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, 'Enter a number'),
    minOrderAmount: money.or(z.literal('')),
    maxUses: z.string().trim().regex(/^\d*$/, 'Whole numbers only'),
    endsAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Pick a date'),
  })
  .superRefine((v, ctx) => {
    const n = Number(v.value);
    if (n <= 0 || (v.type === 'percent' && n > 100)) {
      ctx.addIssue({
        code: 'custom',
        path: ['value'],
        message: v.type === 'percent' ? 'Enter 1 to 100 percent' : 'Enter an amount above 0',
      });
    }
  });

export type DiscountFormValues = z.input<typeof discountFormSchema>;
