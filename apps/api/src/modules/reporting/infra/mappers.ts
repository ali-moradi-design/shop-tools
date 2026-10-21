import type { Prisma } from '@prisma/client';
import type { IssueReport } from '../domain/report.entity';

export type IssueRow = Prisma.IssueReportGetPayload<{
  include: { reporter: { select: { name: true; email: true } } };
}>;

export function mapIssue(row: IssueRow, populate: boolean): IssueReport {
  const issue: IssueReport = {
    id: row.id,
    reporter: row.reporterId,
    type: row.type,
    targetId: row.targetId ?? undefined,
    subject: row.subject,
    body: row.body,
    status: row.status,
    adminNotes: row.adminNotes ?? undefined,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (populate) {
    issue.populated = { reporter: { name: row.reporter.name, email: row.reporter.email } };
  }
  return issue;
}
