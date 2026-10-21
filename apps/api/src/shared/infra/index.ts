import { LocalDiskStorage } from './local-disk.storage';
import { ConsoleNotifier } from './console.notifier';
import { PrismaUnitOfWork } from './uow/prisma-unit-of-work';
import { logger } from '../logging/logger';
import { domainEvents } from '../domain/events';

export const storage = new LocalDiskStorage();
export const notifier = new ConsoleNotifier();
export const unitOfWork = new PrismaUnitOfWork();
export { logger, domainEvents };

domainEvents.on('OrderPaid', async (event) => {
  await notifier.send({
    subject: 'OrderPaid',
    body: JSON.stringify(event.payload),
    meta: { event: event.name },
  });
});

domainEvents.on('StockLow', async (event) => {
  await notifier.send({
    subject: 'StockLow',
    body: JSON.stringify(event.payload),
    meta: { event: event.name },
  });
});
