'use client';

import { useState } from 'react';
import { importProducts, type ImportReport } from '../api/actions';
import { ActionMessage } from './ActionMessage';
import { useAction } from './useAction';

/**
 * Product CSV import: read the file in the browser, check it (a dry run that
 * changes nothing), then import. The export has the same columns, so the
 * usual way is export, edit in a spreadsheet, import.
 */
export function ImportProducts() {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const { pending, result, run } = useAction();

  const go = (dryRun: boolean) =>
    run(
      () => importProducts(csv, dryRun),
      (r) => setReport('report' in r && r.report ? (r.report as ImportReport) : null),
    );

  return (
    <div className="space-y-5 text-[14px]">
      <label className="block max-w-md">
        <span className="mb-1 block">CSV file</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-[14px] file:mr-3 file:border-2 file:border-ink file:bg-paper file:px-3 file:py-2"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setReport(null);
            if (!file) return;
            setFileName(file.name);
            setCsv(await file.text());
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!csv || pending} className="btn btn-outline h-10 px-5" onClick={() => go(true)}>
          {pending ? 'Checking…' : 'Check file'}
        </button>
        <button
          type="button"
          disabled={!csv || pending || !report?.dryRun || report.created + report.updated === 0}
          className="btn h-10 px-5"
          onClick={() => window.confirm(`Import ${fileName}? Existing products with the same slug are updated.`) && go(false)}
        >
          Import
        </button>
        <ActionMessage result={result} />
      </div>
      {report && report.errors.length > 0 && (
        <div>
          <h2 className="heading mb-2 text-[18px]">Rows to fix</h2>
          <ul className="divide-y divide-line border-y border-line">
            {report.errors.map((e) => (
              <li key={`${e.row}-${e.message}`} className="py-2">
                <span className="font-mono text-mute">Row {e.row}</span>
                {e.slug && <span className="ml-2">{e.slug}</span>}
                <span className="ml-2 text-danger">{e.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
