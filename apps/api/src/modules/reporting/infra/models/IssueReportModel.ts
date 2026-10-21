import { Schema, model, Document, Types, Query } from 'mongoose';
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  type IssueType,
  type IssueStatus,
} from '@modules/reporting/domain/report.entity';

export interface IIssueReportDoc extends Document {
  reporter: Types.ObjectId;
  type: IssueType;
  targetId?: Types.ObjectId;
  subject: string;
  body: string;
  status: IssueStatus;
  adminNotes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const issueReportSchema = new Schema<IIssueReportDoc>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ISSUE_TYPES, required: true },
    targetId: { type: Schema.Types.ObjectId },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    status: { type: String, enum: ISSUE_STATUSES, default: 'open' },
    adminNotes: { type: String },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

issueReportSchema.pre(/^find/, function (this: Query<unknown, IIssueReportDoc>) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
});

export const IssueReportModel = model<IIssueReportDoc>('IssueReport', issueReportSchema);
