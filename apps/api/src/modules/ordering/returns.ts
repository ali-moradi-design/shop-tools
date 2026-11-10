import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { authenticate, requirePermission } from '@modules/identity/http/middleware';
import { validate } from '@shared/http/middleware/validate';
import { asyncHandler } from '@shared/http/asyncHandler';
import { DomainError } from '@shared/domain/DomainError';
import { paginate } from '@shared/pagination';
import { domainEvents, returnUpdatedEvent } from '@shared/domain/events';
import { prisma } from '@shared/infra/prisma/client';
import { orderRepo, orderService, payments } from './infra/wiring';

/*
 * Returns. A customer asks within RETURN_WINDOW_DAYS of shipping; staff approve, mark
 * the parcel received, then refund. Refunds go back through the payment provider.
 * (Tools have options such as "Body only" or a kit, not sizes, so there are no exchanges.)
 */

export const RETURN_WINDOW_DAYS = 30;
export const RETURN_STATUSES = ['requested', 'approved', 'rejected', 'received', 'refunded'] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];
export const RETURN_REASONS = ['not-as-described', 'damaged', 'defective', 'wrong-item', 'changed-mind', 'other'] as const;

const NEXT: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected'],
  approved: ['received', 'rejected'],
  received: ['refunded'],
  rejected: [],
  refunded: [],
};

interface ReturnItem {
  sku: string;
  title: string;
  label: string;
  quantity: number;
  price: number;
}
type HistoryEntry = { status: ReturnStatus; at: string; note?: string };
type ReturnRow = Prisma.ReturnRequestGetPayload<object>;

function present(r: ReturnRow) {
  return {
    id: r.id,
    order: r.orderId,
    user: r.userId,
    items: r.items as unknown as ReturnItem[],
    reason: r.reason,
    comment: r.comment ?? undefined,
    status: r.status as ReturnStatus,
    refundAmount: r.refundAmount,
    refunded: Boolean(r.refundId),
    history: r.history as unknown as HistoryEntry[],
    createdAt: r.createdAt,
  };
}

/** Lines are named by their position in the order, not by SKU (a SKU may contain dots). */
const createSchema = z.object({
  orderId: z.string().min(1).max(40),
  reason: z.enum(RETURN_REASONS),
  comment: z.string().trim().max(1000).optional(),
  items: z.array(z.object({ line: z.number().int().min(0), quantity: z.number().int().min(1) })).min(1).max(50),
});

export const returnsService = {
  async create(userId: string, input: z.infer<typeof createSchema>) {
    const order = await orderService.getById(input.orderId, userId, false);
    if (!['shipped', 'completed'].includes(order.status)) {
      throw new DomainError('Returns open once your order has shipped', 'VALIDATION');
    }
    const shippedAt = order.shipment?.shippedAt ?? order.statusHistory.find((h) => h.status === 'shipped')?.at;
    if (shippedAt && Date.now() - new Date(shippedAt).getTime() > RETURN_WINDOW_DAYS * 86_400_000) {
      throw new DomainError(`Returns are accepted for ${RETURN_WINDOW_DAYS} days after shipping`, 'VALIDATION');
    }
    // units already in an open or finished return cannot be returned twice
    const earlier = await prisma.returnRequest.findMany({ where: { orderId: order.id, status: { not: 'rejected' } } });
    const taken = new Map<string, number>();
    for (const r of earlier) for (const i of r.items as unknown as ReturnItem[]) taken.set(i.sku, (taken.get(i.sku) ?? 0) + i.quantity);

    const wanted = new Map<number, number>();
    for (const w of input.items) wanted.set(w.line, (wanted.get(w.line) ?? 0) + w.quantity);
    const items: ReturnItem[] = [...wanted].map(([index, quantity]) => {
      const line = order.items[index];
      if (!line) throw new DomainError('That item is not in this order', 'VALIDATION');
      const left = line.quantity - (taken.get(line.sku) ?? 0);
      if (quantity > left) throw new DomainError(`You can return at most ${Math.max(0, left)} of ${line.title} (${line.label})`, 'VALIDATION');
      return { sku: line.sku, title: line.title, label: line.label, quantity, price: line.price };
    });
    // a discount is shared out across the lines, so refunds never exceed what was paid
    const share = order.subtotalAmount > 0 ? order.totalAmount / order.subtotalAmount : 1;
    const refundAmount = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * share);

    const row = await prisma.returnRequest.create({
      data: {
        orderId: order.id,
        userId,
        items: items as unknown as Prisma.InputJsonValue,
        reason: input.reason,
        comment: input.comment,
        refundAmount,
        history: [{ status: 'requested', at: new Date().toISOString() }] as unknown as Prisma.InputJsonValue,
      },
    });
    const r = present(row);
    await domainEvents.publish(returnUpdatedEvent({ returnId: r.id, orderId: r.order, userId, status: 'requested' }));
    return r;
  },

  async listMine(userId: string, orderId?: string) {
    const rows = await prisma.returnRequest.findMany({ where: { userId, ...(orderId ? { orderId } : {}) }, orderBy: { createdAt: 'desc' } });
    return rows.map(present);
  },

  async list(query: { status?: ReturnStatus; page?: number; limit?: number }) {
    const { page, limit, skip } = paginate(query.page, query.limit ?? 50);
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      prisma.returnRequest.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take: limit }),
      prisma.returnRequest.count({ where }),
    ]);
    return { data: rows.map(present), meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  },

  async update(id: string, status: ReturnStatus, note?: string) {
    const row = await prisma.returnRequest.findUnique({ where: { id } });
    if (!row) throw new DomainError('Return not found', 'NOT_FOUND');
    const current = row.status as ReturnStatus;
    if (!NEXT[current].includes(status)) throw new DomainError(`A ${current} return cannot become ${status}`, 'ILLEGAL_TRANSITION');
    let refundId = row.refundId;
    if (status === 'refunded' && row.refundAmount > 0 && !refundId) {
      const order = await orderRepo.findById(row.orderId);
      if (order?.payment.method === 'stripe' && order.payment.transactionId) {
        refundId = await payments.gateway.refund(order.payment.transactionId, row.refundAmount);
      }
    }
    const history = [...(row.history as unknown as HistoryEntry[]), { status, at: new Date().toISOString(), ...(note ? { note } : {}) }];
    // only the status it was read in moves on, so two staff clicks cannot refund twice
    const { count } = await prisma.returnRequest.updateMany({
      where: { id, status: current },
      data: { status, refundId, history: history as unknown as Prisma.InputJsonValue },
    });
    if (count === 0) throw new DomainError('This return was changed by someone else; reload the page', 'CONFLICT');
    const r = present((await prisma.returnRequest.findUnique({ where: { id } }))!);
    await domainEvents.publish(returnUpdatedEvent({ returnId: r.id, orderId: r.order, userId: r.user, status, note }));
    return r;
  },
};

export const returnsRouter = Router();
returnsRouter.use(authenticate);

returnsRouter.post(
  '/',
  requirePermission('orders:read-own'),
  validate({ body: createSchema }),
  asyncHandler(async (req, res) => {
    res.status(201).json({ data: await returnsService.create(req.user!.id, req.body) });
  }),
);

returnsRouter.get(
  '/mine',
  validate({ query: z.object({ order: z.string().min(1).max(40).optional() }) }),
  asyncHandler(async (req, res) => {
    res.json({ data: await returnsService.listMine(req.user!.id, req.query.order as string | undefined) });
  }),
);

returnsRouter.get(
  '/',
  requirePermission('orders:update-status'),
  validate({
    query: z.object({
      status: z.enum(RETURN_STATUSES).optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    res.json(await returnsService.list(req.query as { status?: ReturnStatus; page?: number; limit?: number }));
  }),
);

returnsRouter.patch(
  '/:id',
  requirePermission('orders:update-status'),
  validate({
    params: z.object({ id: z.string().min(1).max(40) }),
    body: z.object({ status: z.enum(RETURN_STATUSES), note: z.string().trim().max(500).optional() }),
  }),
  asyncHandler(async (req, res) => {
    res.json({ data: await returnsService.update(String(req.params.id), req.body.status, req.body.note) });
  }),
);
