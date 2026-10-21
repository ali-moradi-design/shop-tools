'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-28 text-center">
      <h1 className="heading text-[32px]">Something went wrong</h1>
      <p className="mt-3 text-mute">{error.message}</p>
      <button type="button" onClick={reset} className="btn mt-8">
        Try again
      </button>
    </div>
  );
}
