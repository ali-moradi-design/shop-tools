import 'server-only';
import { headers } from 'next/headers';

/**
 * The visitor's IP, passed on to the API as `X-Forwarded-For`. Server-side renders call the API
 * from the storefront's own address; without this every visitor would share one rate-limit budget.
 */
export async function visitorIpHeaders(): Promise<Record<string, string>> {
  try {
    const h = await headers();
    const ip = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim();
    return ip ? { 'X-Forwarded-For': ip } : {};
  } catch {
    return {}; // outside a request (build time)
  }
}
