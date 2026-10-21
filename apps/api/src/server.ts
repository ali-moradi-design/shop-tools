import app from './app';
import { connectDb } from './shared/config/db';
import { env } from './shared/config/env';
import { logger } from './shared/logging/logger';
import { cartRepo } from './modules/ordering';

const GUEST_CART_TTL_MS = 30 * 24 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** Guest carts nobody touched for 30 days are removed (the MongoDB version used a TTL index). */
async function purgeGuestCarts(): Promise<void> {
  try {
    const removed = await cartRepo.purgeStaleGuestCarts(new Date(Date.now() - GUEST_CART_TTL_MS));
    if (removed) logger.info('guest_carts_purged', { removed });
  } catch (err) {
    logger.error('guest_cart_purge_failed', { err: err instanceof Error ? err.message : String(err) });
  }
}

async function main() {
  await connectDb();
  void purgeGuestCarts();
  setInterval(() => void purgeGuestCarts(), DAY_MS).unref();
  app.listen(env.PORT, () => {
    logger.info('server_started', {
      port: env.PORT,
      docs: `http://localhost:${env.PORT}/api/docs`,
    });
  });
}

main().catch((err) => {
  logger.error('server_start_failed', {
    err: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
