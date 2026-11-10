'use client';

export function PrintButton({ label = 'Print label' }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn h-10 px-5">
      {label}
    </button>
  );
}
