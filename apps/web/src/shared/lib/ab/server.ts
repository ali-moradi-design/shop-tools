import 'server-only';
import { cookies } from 'next/headers';
import { after } from 'next/server';
import { API_V1 } from '@/shared/config';
import { EXPERIMENTS, VISITOR_COOKIE, cookieName, isVariant, type ExperimentKey, type VariantOf } from './experiments';

/**
 * The visitor's variant, from the cookie proxy.ts set. Reading cookies makes the
 * caller dynamic, so call it only inside a part that is per visitor already.
 */
export async function getVariant<K extends ExperimentKey>(key: K): Promise<VariantOf<K>> {
  const value = (await cookies()).get(cookieName(key))?.value;
  return isVariant(key, value) ? value : ('control' as VariantOf<K>);
}

/**
 * Records a conversion from the server, for every experiment the visitor is in. Sent with
 * after(), so the page does not wait for it; the API keeps one event per visitor.
 */
export async function trackServerConversion(type: 'add_to_cart' | 'purchase'): Promise<void> {
  const jar = await cookies();
  const visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor) return;
  const events = (Object.keys(EXPERIMENTS) as ExperimentKey[]).flatMap((key) => {
    const variant = jar.get(cookieName(key))?.value;
    return isVariant(key, variant) ? [{ experiment: key, variant, type }] : [];
  });
  if (events.length === 0) return;
  after(() =>
    fetch(`${API_V1}/experiments/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitor, events }),
    }).then(
      () => undefined,
      () => undefined,
    ),
  );
}
