import { randomBytes } from 'node:crypto';
import { env } from '@shared/config/env';
import { prisma } from '@shared/infra/prisma/client';
import { paginate } from '@shared/pagination';
import { mailer } from './mailer';
import { templates } from './templates';

export const newsletterService = {
  /**
   * Adds (or re-adds) an address. The answer is the same whether or not it was
   * already on the list, so the form cannot be used to test who subscribed.
   */
  async subscribe(email: string, source = 'footer'): Promise<void> {
    const address = email.trim().toLowerCase();
    const existing = await prisma.subscriber.findUnique({ where: { email: address } });
    if (existing && !existing.unsubscribedAt) return;
    const row = await prisma.subscriber.upsert({
      where: { email: address },
      create: { email: address, token: randomBytes(24).toString('hex'), source },
      update: { unsubscribedAt: null, source },
    });
    const url = `${env.STOREFRONT_URL.replace(/\/$/, '')}/newsletter/unsubscribe?token=${row.token}`;
    await mailer.send({ to: address, template: 'newsletter-welcome', ...templates.newsletterWelcome(url) });
  },

  async unsubscribe(token: string): Promise<boolean> {
    const res = await prisma.subscriber.updateMany({ where: { token, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
    // an already used link still counts as done for the visitor
    return res.count > 0 || (await prisma.subscriber.count({ where: { token } })) > 0;
  },

  async list(query: { page?: number; limit?: number }) {
    const { page, limit, skip } = paginate(query.page, query.limit ?? 50);
    const where = { unsubscribedAt: null };
    const [rows, total] = await Promise.all([
      prisma.subscriber.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.subscriber.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({ id: r.id, email: r.email, source: r.source, createdAt: r.createdAt })),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  },
};
