import { domainEvents, type DomainEventName, type OrderChangedPayload, type OrderPaidPayload, type StockLowPayload } from '@shared/domain/events';
import { env } from '@shared/config/env';
import { logger } from '@shared/logging/logger';
import { prisma } from '@shared/infra/prisma/client';
import { mailer } from './mailer';
import { templates } from './templates';

const log = logger.child({ module: 'notifications' });

/** Runs a handler without letting an email problem fail the request that raised the event. */
function safely<T>(name: DomainEventName, fn: (payload: T) => Promise<void>) {
  domainEvents.on(name, async (event) => {
    try {
      await fn(event.payload as T);
    } catch (err) {
      log.error('notification failed', { event: name, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

const emailOf = async (userId: string) =>
  (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? null;

async function adminEmails(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, deletedAt: null, roles: { some: { role: { name: 'admin' } } } },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

let registered = false;

/** Customer and staff emails for order and stock events. Safe to call more than once. */
export function registerNotifications(): void {
  if (registered) return;
  registered = true;

  safely<OrderPaidPayload>('OrderPaid', async ({ orderId, userId }) => {
    const [order, to] = await Promise.all([prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }), emailOf(userId)]);
    if (order && to) await mailer.send({ to, template: 'order-confirmed', ...templates.orderConfirmed(order) });
  });

  safely<OrderChangedPayload>('OrderShipped', async ({ orderId, userId }) => {
    const to = await emailOf(userId);
    if (to) await mailer.send({ to, template: 'order-shipped', ...templates.orderShipped({ id: orderId }) });
  });

  safely<OrderChangedPayload>('OrderCancelled', async ({ orderId, userId, refunded }) => {
    const to = await emailOf(userId);
    if (to) await mailer.send({ to, template: 'order-cancelled', ...templates.orderCancelled({ id: orderId }, Boolean(refunded)) });
  });

  safely<StockLowPayload>('StockLow', async ({ productId, title, stock }) => {
    const recipients = env.ADMIN_ALERT_EMAIL ? [env.ADMIN_ALERT_EMAIL] : await adminEmails();
    for (const to of recipients) await mailer.send({ to, template: 'low-stock', ...templates.lowStock({ id: productId, title, stock }) });
  });
}
