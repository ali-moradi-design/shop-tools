import type { IIssueReportRepository } from '@modules/reporting/domain/report.repository';
import type {
  IssueReport,
  CreateIssueInput,
  UpdateIssueInput,
} from '@modules/reporting/domain/report.entity';
import { getPrisma } from '@shared/infra/prisma/client';
import { mapIssue } from './mappers';

const include = { reporter: { select: { name: true, email: true } } } as const;
const live = { deletedAt: null } as const;

export class PrismaIssueReportRepository implements IIssueReportRepository {
  async findById(id: string, populate = false): Promise<IssueReport | null> {
    const row = await getPrisma().issueReport.findFirst({ where: { id, ...live }, include });
    return row ? mapIssue(row, populate) : null;
  }

  async list(filter: { reporterId?: string }, populate = false): Promise<IssueReport[]> {
    const rows = await getPrisma().issueReport.findMany({
      where: { ...live, ...(filter.reporterId ? { reporterId: filter.reporterId } : {}) },
      orderBy: { createdAt: 'desc' },
      include,
    });
    return rows.map((r) => mapIssue(r, populate));
  }

  async create(input: CreateIssueInput): Promise<IssueReport> {
    const row = await getPrisma().issueReport.create({
      data: {
        reporterId: input.reporter,
        type: input.type,
        targetId: input.targetId,
        subject: input.subject,
        body: input.body,
        status: 'open',
      },
      include,
    });
    return mapIssue(row, false);
  }

  async update(id: string, input: UpdateIssueInput): Promise<IssueReport | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const row = await getPrisma().issueReport.update({
      where: { id },
      data: {
        status: input.status,
        adminNotes: input.adminNotes,
        subject: input.subject,
        body: input.body,
      },
      include,
    });
    return mapIssue(row, false);
  }

  async softDelete(id: string): Promise<IssueReport | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    const row = await getPrisma().issueReport.update({
      where: { id },
      data: { deletedAt: new Date() },
      include,
    });
    return mapIssue(row, false);
  }

  async countOpen(): Promise<number> {
    return getPrisma().issueReport.count({ where: { ...live, status: 'open' } });
  }
}
