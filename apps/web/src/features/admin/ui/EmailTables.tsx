'use client';

import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { useState } from 'react';
import { cn } from '@/shared/lib/cn';
import { DataTable } from './DataTable';

const day = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });
const dayTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });
const features = tableFeatures({});

export interface EmailRow {
  id: string;
  to: string;
  subject: string;
  template: string;
  status: 'sent' | 'outbox' | 'failed';
  error?: string | null;
  text: string;
  createdAt: string;
}

const emailHelper = createColumnHelper<typeof features, EmailRow>();
const emailColumns = emailHelper.columns([
  emailHelper.accessor('createdAt', { header: 'When', cell: ({ getValue }) => <span className="whitespace-nowrap">{dayTime.format(new Date(getValue()))}</span> }),
  emailHelper.accessor('to', { header: 'To' }),
  emailHelper.accessor('subject', { header: 'Subject', cell: ({ row }) => <EmailPreview email={row.original} /> }),
  emailHelper.accessor('status', {
    header: 'Status',
    cell: ({ row: { original: e } }) => (
      <span className={cn(e.status === 'failed' ? 'text-danger' : e.status === 'sent' ? 'font-semibold' : 'text-mute')} title={e.error ?? undefined}>
        {e.status === 'outbox' ? 'Kept (no SMTP)' : e.status === 'sent' ? 'Sent' : 'Failed'}
      </span>
    ),
  }),
]);

/** The text body opens in place, which is how staff read mail while SMTP is off. */
function EmailPreview({ email }: { email: EmailRow }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="block max-w-[460px]">
      <button type="button" className="text-left text-ink hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {email.subject}
      </button>
      <span className="block font-mono text-[11px] text-mute">{email.template}</span>
      {open && <span className="mt-2 block whitespace-pre-wrap break-words border-l-4 border-accent pl-3 text-[13px]">{email.text}</span>}
    </span>
  );
}

export function EmailsTable({ rows }: { rows: EmailRow[] }) {
  const table = useTable({ features, columns: emailColumns, data: rows, getRowId: (r) => r.id });
  return <DataTable table={table} label="Emails" empty="No emails yet." rowTestId="admin-email" />;
}

export interface SubscriberRow {
  id: string;
  email: string;
  source: string;
  createdAt: string;
}

const subHelper = createColumnHelper<typeof features, SubscriberRow>();
const subColumns = subHelper.columns([
  subHelper.accessor('email', { header: 'Email' }),
  subHelper.accessor('source', { header: 'Signed up from' }),
  subHelper.accessor('createdAt', { header: 'Since', cell: ({ getValue }) => day.format(new Date(getValue())) }),
]);

export function SubscribersTable({ rows }: { rows: SubscriberRow[] }) {
  const table = useTable({ features, columns: subColumns, data: rows, getRowId: (r) => r.id });
  return <DataTable table={table} label="Subscribers" empty="No subscribers yet." />;
}
