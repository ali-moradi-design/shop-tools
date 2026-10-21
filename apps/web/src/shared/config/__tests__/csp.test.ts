import { describe, expect, it } from 'vitest';
import { buildCsp, createNonce } from '../csp';

describe('Content Security Policy', () => {
  it('lets only scripts with the request nonce run (no unsafe-inline for scripts)', () => {
    const csp = buildCsp('abc123', true);
    const script = csp.split('; ').find((d) => d.startsWith('script-src'))!;
    expect(script).toContain("'nonce-abc123'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
  });

  it('allows eval only in development (React refresh)', () => {
    expect(buildCsp('n', false)).toContain("'unsafe-eval'");
  });

  it('forbids framing, plugins and foreign forms, and upgrades requests in production', () => {
    const csp = buildCsp('n', true);
    for (const d of ["frame-ancestors 'none'", "object-src 'none'", "form-action 'self'", "base-uri 'self'", 'upgrade-insecure-requests']) {
      expect(csp).toContain(d);
    }
  });

  it('makes a new nonce for every request', () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce));
    expect(nonces.size).toBe(50);
  });
});
