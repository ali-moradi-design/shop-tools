'use client';

import { useEffect } from 'react';
import { EXPERIMENTS, VISITOR_COOKIE, cookieName, isVariant, type ExperimentKey } from './experiments';

type EventType = 'exposure' | 'add_to_cart' | 'purchase';

function readCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function send(events: { experiment: string; variant: string; type: EventType }[]) {
  const visitor = readCookie(VISITOR_COOKIE);
  if (!visitor || events.length === 0) return;
  const body = JSON.stringify({ visitor, events });
  // sendBeacon survives the page being left (add to cart, then checkout)
  const sent = navigator.sendBeacon?.('/api/v1/experiments/events', new Blob([body], { type: 'application/json' }));
  if (!sent) fetch('/api/v1/experiments/events', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
}

/** Records that the visitor saw this experiment (once per page view; the API keeps one per visitor). */
export function useExposure(key: ExperimentKey, variant: string) {
  useEffect(() => {
    send([{ experiment: key, variant, type: 'exposure' }]);
  }, [key, variant]);
}

/** A conversion for every experiment the visitor is in. */
export function trackConversion(type: 'add_to_cart' | 'purchase') {
  const events = (Object.keys(EXPERIMENTS) as ExperimentKey[]).flatMap((key) => {
    const variant = readCookie(cookieName(key));
    return isVariant(key, variant) ? [{ experiment: key, variant, type }] : [];
  });
  send(events);
}
