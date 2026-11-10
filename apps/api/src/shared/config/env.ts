import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

dotenv.config();

const optionalBool = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined || v.trim() === '') return undefined;
    return ['true', '1', 'yes'].includes(v.trim().toLowerCase());
  });

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v.trim() : undefined));

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // Express 'trust proxy': hops in front of the API (e.g. 1 = the storefront's /api proxy route),
  // so rate limits use the visitor's IP instead of the storefront's.
  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  // requests per visitor IP and 15 minutes (the storefront renders every page on the server and asks the API several times)
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  // sign-in, sign-up, password reset and guest checkout attempts per visitor IP and 15 minutes
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  UPLOAD_DIR: z.string().default('uploads'),
  COOKIE_SECURE: optionalBool,
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  // where Stripe sends the customer back to (the storefront's public address)
  STOREFRONT_URL: z.string().url().default('http://localhost:3000'),
  // Stripe test mode; without a key the local Checkout simulator is used
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  PAYMENT_CURRENCY: z.string().length(3).toLowerCase().default('usd'),
  // email: SMTP when set (any provider); every email is also kept in the admin outbox
  SMTP_URL: optionalString,
  MAIL_FROM: z.string().default('Toolbench Supply Co. <no-reply@shop-tools.local>'),
  // low-stock alerts go here; without it, to every active admin
  ADMIN_ALERT_EMAIL: optionalString,
  COOKIE_DOMAIN: z
    .string()
    .optional()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed ? trimmed : undefined;
    }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

// a demo shop: never take real money
if (data.STRIPE_SECRET_KEY && !data.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
  console.error('STRIPE_SECRET_KEY must be a test key (sk_test_...)');
  process.exit(1);
}
if (data.STRIPE_SECRET_KEY && !data.STRIPE_WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set');
  process.exit(1);
}

// Production refuses guessable secrets and a wildcard CORS origin.
if (data.NODE_ENV === 'production') {
  const problems: string[] = [];
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (data[key].length < 32 || /change-me|secret|example/i.test(data[key])) {
      problems.push(`${key} must be a random value of at least 32 characters`);
    }
  }
  if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }
  if (data.CORS_ORIGIN.trim() === '*') problems.push('CORS_ORIGIN must list the storefront origin');
  if (problems.length) {
    console.error('Unsafe production configuration:\n- ' + problems.join('\n- '));
    process.exit(1);
  }
}

/**
 * CORS with credentials cannot use `Access-Control-Allow-Origin: *`.
 * If CORS_ORIGIN is `*`, reflect the request origin in development/test.
 * Production must set an explicit origin (e.g. https://app.example.com).
 */
export function resolveCorsOrigin(): boolean | string | string[] {
  const raw = data.CORS_ORIGIN.trim();
  if (raw === '*') {
    return data.NODE_ENV === 'production' ? false : true;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return false;
  if (list.length === 1) return list[0];
  return list;
}

export const env = {
  ...data,
  COOKIE_SECURE: data.COOKIE_SECURE ?? data.NODE_ENV === 'production',
  UPLOAD_DIR_ABS: path.isAbsolute(data.UPLOAD_DIR)
    ? data.UPLOAD_DIR
    : path.resolve(process.cwd(), data.UPLOAD_DIR),
};
