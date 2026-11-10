import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export const inputClass =
  'mt-1 block w-full border-2 border-ink bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-accent aria-[invalid=true]:border-danger';

/** Label, control and its error message, linked for screen readers. */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('text-[14px]', className)}>
      <label htmlFor={htmlFor} className="text-ink">{label}</label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="mt-1 text-[12px] text-mute">{hint}</p>}
      {error && <p id={`${htmlFor}-error`} className="mt-1 text-[12px] text-danger">{error}</p>}
    </div>
  );
}

/** aria props for a control inside <Field>. */
export const describe = (id: string, error?: string, hint?: string) => ({
  id,
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});
