/** Page Content-Security-Policy (audit F-016). */
import { describe, it, expect } from 'vitest';
import { buildCsp, createNonce } from '@/lib/csp';

const directive = (csp: string, name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `)) ?? '';

describe('buildCsp', () => {
  it('allows scripts by nonce only in production', () => {
    const csp = buildCsp({ nonce: 'abc', isDev: false, apiHost: 'https://api.example' });
    const script = directive(csp, 'script-src');
    expect(script).toContain("'nonce-abc'");
    expect(script).toContain("'strict-dynamic'");
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(directive(csp, 'connect-src')).toContain('wss://api.example');
  });

  it('adds unsafe-eval in development only, and no https upgrade for an http API', () => {
    const csp = buildCsp({ nonce: 'abc', isDev: true, apiHost: 'http://localhost:3001' });
    expect(directive(csp, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(csp, 'script-src')).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('keeps the restrictive directives', () => {
    const csp = buildCsp({ nonce: 'n', isDev: false, apiHost: 'https://api.example' });
    for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'"]) expect(csp).toContain(d);
  });
});

describe('createNonce', () => {
  it('makes a different 128-bit base64 value each time', () => {
    const a = createNonce(); const b = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(a).not.toBe(b);
  });
});
