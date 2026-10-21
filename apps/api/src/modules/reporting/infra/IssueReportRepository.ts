import type { IIssueReportRepository } from '@modules/reporting/domain/report.repository';
import type {
  IssueReport,
  CreateIssueInput,
  UpdateIssueInput,
} from '@modules/reporting/domain/report.entity';
import { IssueReportModel } from './models/IssueReportModel';
import { mapIssue } from './mappers';

export class MongooseIssueReportRepository implements IIssueReportRepository {
  async findById(id: string, populate = false): Promise<IssueReport | null> {
    let q = IssueReportModel.findById(id);
    if (populate) q = q.populate('reporter', 'name email');
    const doc = await q;
    return doc ? mapIssue(doc) : null;
  }

  async list(
    filter: { reporterId?: string },
    populate = false,
  ): Promise<IssueReport[]> {
    const q: Record<string, unknown> = {};
    if (filter.reporterId) q.reporter = filter.reporterId;
    let query = IssueReportModel.find(q).sort({ createdAt: -1 });
    if (populate) query = query.populate('reporter', 'name email');
    const docs = await query;
    return docs.map(mapIssue);
  }

  async create(input: CreateIssueInput): Promise<IssueReport> {
    const doc = await IssueReportModel.create({
      reporter: input.reporter,
      type: input.type,
      targetId: input.targetId,
      subject: input.subject,
      body: input.body,
      status: 'open',
    });
    return mapIssue(doc);
  }

  async update(id: string, input: UpdateIssueInput): Promise<IssueReport | null> {
    const doc = await IssueReportModel.findById(id);
    if (!doc) return null;
    if (input.status !== undefined) doc.status = input.status;
    if (input.adminNotes !== undefined) doc.adminNotes = input.adminNotes;
    if (input.subject !== undefined) doc.subject = input.subject;
    if (input.body !== undefined) doc.body = input.body;
    await doc.save();
    return mapIssue(doc);
  }

  async softDelete(id: string): Promise<IssueReport | null> {
    const doc = await IssueReportModel.findById(id);
    if (!doc) return null;
    doc.deletedAt = new Date();
    await doc.save();
    return mapIssue(doc);
  }

  async countOpen(): Promise<number> {
    return IssueReportModel.countDocuments({ status: 'open' });
  }
}
