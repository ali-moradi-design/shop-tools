'use client';

import { useState } from 'react';

/** Native share sheet where there is one (phones), otherwise copies the link. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href.split('#')[0];
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => {});
      return;
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button type="button" onClick={share} className="text-[13px] text-mute underline underline-offset-4 hover:text-ink">
      <span aria-live="polite">{copied ? 'Link copied' : 'Share'}</span>
    </button>
  );
}
