import app from './app';
import { connectDb } from './shared/config/db';
import { env } from './shared/config/env';
import { logger } from './shared/logging/logger';
import { cartRepo } from './modules/ordering';
import { prisma } from './shared/infra/prisma/client';

const GUEST_CART_TTL_MS = 30 * 24 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** Guest carts nobody touched for 30 days are removed. */
async function purgeGuestCarts(): Promise<void> {
  try {
    const removed = await cartRepo.purgeStaleGuestCarts(new Date(Date.now() - GUEST_CART_TTL_MS));
    if (removed) logger.info('guest_carts_purged', { removed });
  } catch (err) {
    logger.error('guest_cart_purge_failed', { err: err instanceof Error ? err.message : String(err) });
  }
}

const OUTBOX_TTL_MS = 90 * DAY_MS;

/** The email outbox is a log, not an archive: copies older than 90 days are removed. */
async function purgeOldEmails(): Promise<void> {
  try {
    const { count } = await prisma.emailMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - OUTBOX_TTL_MS) } } });
    if (count) logger.info('old_emails_purged', { removed: count });
  } catch (err) {
    logger.error('email_purge_failed', { err: err instanceof Error ? err.message : String(err) });
  }
}

/** The activity log keeps one year. */
async function purgeOldAudit(): Promise<void> {
  try {
    await prisma.auditEntry.deleteMany({ where: { at: { lt: new Date(Date.now() - 365 * DAY_MS) } } });
  } catch (err) {
    logger.error('audit_purge_failed', { err: err instanceof Error ? err.message : String(err) });
  }
}

async function main() {
  await connectDb();
  const daily = () => {
    void purgeGuestCarts();
    void purgeOldEmails();
    void purgeOldAudit();
  };
  daily();
  setInterval(daily, DAY_MS).unref();
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
