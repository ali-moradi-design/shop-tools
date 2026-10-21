import type { IssueReport } from '../domain/report.entity';

function idOf(doc: { id?: string; _id?: { toString(): string } }): string {
  return doc.id ?? doc._id!.toString();
}

export function mapIssue(doc: {
  id?: string;
  _id?: { toString(): string };
  reporter: unknown;
  type: IssueReport['type'];
  targetId?: { toString(): string };
  subject: string;
  body: string;
  status: IssueReport['status'];
  adminNotes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): IssueReport {
  const reporterObj = doc.reporter as {
    _id?: { toString(): string };
    id?: string;
    name?: string;
    email?: string;
    toString?: () => string;
  };
  const reporterId =
    reporterObj && typeof reporterObj === 'object' && (reporterObj._id || reporterObj.id)
      ? (reporterObj.id ?? reporterObj._id!.toString())
      : String(doc.reporter);

  const issue: IssueReport = {
    id: idOf(doc),
    reporter: reporterId,
    type: doc.type,
    targetId: doc.targetId?.toString(),
    subject: doc.subject,
    body: doc.body,
    status: doc.status,
    adminNotes: doc.adminNotes,
    deletedAt: doc.deletedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  if (reporterObj?.name) {
    issue.populated = {
      reporter: { name: reporterObj.name, email: reporterObj.email ?? '' },
    };
  }
  return issue;
}
