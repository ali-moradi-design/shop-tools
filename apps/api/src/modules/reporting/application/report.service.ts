import type { IIssueReportRepository } from '@modules/reporting/domain/report.repository';
import type { IOrderRepository, OrderStatsFilter } from '@modules/ordering';
import type {
  CreateIssueInput,
  UpdateIssueInput,
  IssueReport,
} from '@modules/reporting/domain/report.entity';
import { AppError } from '@shared/errors/AppError';

export class ReportService {
  constructor(
    private readonly issues: IIssueReportRepository,
    private readonly orders: IOrderRepository,
  ) {}

  async createIssue(input: CreateIssueInput) {
    return this.toResponse(await this.issues.create(input));
  }

  async listIssues(userId: string, canManage: boolean) {
    const list = await this.issues.list(
      canManage ? {} : { reporterId: userId },
      true,
    );
    return list.map((i) => this.toResponse(i));
  }

  async getIssue(id: string, userId: string, canManage: boolean) {
    const issue = await this.issues.findById(id, true);
    if (!issue) throw new AppError('Issue not found', 404);
    if (!canManage && issue.reporter !== userId) {
      throw new AppError('Forbidden', 403);
    }
    return this.toResponse(issue);
  }

  async updateIssue(
    id: string,
    body: UpdateIssueInput,
    userId: string,
    canManage: boolean,
  ) {
    const issue = await this.issues.findById(id);
    if (!issue) throw new AppError('Issue not found', 404);

    if (canManage) {
      const updated = await this.issues.update(id, body);
      return this.toResponse(updated!);
    }

    if (issue.reporter !== userId) throw new AppError('Forbidden', 403);
    if (issue.status !== 'open') {
      throw new AppError('Cannot edit issue after staff pickup', 400);
    }
    const updated = await this.issues.update(id, {
      subject: body.subject,
      body: body.body,
    });
    return this.toResponse(updated!);
  }

  async deleteIssue(id: string, userId: string, canManage: boolean) {
    const issue = await this.issues.findById(id);
    if (!issue) throw new AppError('Issue not found', 404);
    if (!canManage && issue.reporter !== userId) {
      throw new AppError('Forbidden', 403);
    }
    await this.issues.softDelete(id);
  }

  private paidFilter(from?: string, to?: string): OrderStatsFilter {
    return {
      ...(from ? { paidFrom: new Date(from) } : {}),
      ...(to ? { paidTo: new Date(to) } : {}),
    };
  }

  async revenueSummary(from?: string, to?: string) {
    return this.orders.aggregateRevenue(this.paidFilter(from, to));
  }

  async ordersByStatus() {
    return this.orders.aggregateByStatus();
  }

  async topProducts(from?: string, to?: string, limit = 10) {
    return this.orders.aggregateTopProducts(this.paidFilter(from, to), Math.min(limit, 50));
  }

  async salesByDate(from?: string, to?: string) {
    return this.orders.aggregateSalesByDate(this.paidFilter(from, to));
  }

  private toResponse(issue: IssueReport) {
    return {
      id: issue.id,
      _id: issue.id,
      reporter: issue.populated?.reporter
        ? { _id: issue.reporter, ...issue.populated.reporter }
        : issue.reporter,
      type: issue.type,
      targetId: issue.targetId,
      subject: issue.subject,
      body: issue.body,
      status: issue.status,
      adminNotes: issue.adminNotes,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    };
  }
}
