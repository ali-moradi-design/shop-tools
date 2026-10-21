import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';

/** Called by the API's nightly demo reset: drops the cached catalog. */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const given = request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 });
  }
  revalidateTag('products', 'max');
  return Response.json({ revalidated: true });
}
