/**
 * Frontend error tracking never receives guest order tokens, signed-link
 * signatures or the user's email (audit F-015).
 */
import { describe, expect, it } from 'vitest';
import { redactUrl, scrubSentryEvent, REDACTED } from '@/lib/redact';
import { sentryPrivacyOptions } from '@/lib/sentry';

const TOKEN = 'Zk3vQ9-secret-guest-token_abcdefghijklmnopqrstuvwxyz';

describe('redactUrl', () => {
  it.each([
    [`/order/${TOKEN}`, `/order/${REDACTED}`],
    [`https://app.example/order/${TOKEN}?tab=pay#x`, `https://app.example/order/${REDACTED}?tab=pay`],
    [`/api/direct-orders/link/${TOKEN}/receipt`, `/api/direct-orders/link/${REDACTED}/receipt`],
    ['/api/private-files/a/b.png?expires=1&signature=s', `/api/private-files/${REDACTED}?expires=1&signature=${REDACTED}`],
    ['/reset-password?token=abc', `/reset-password?token=${REDACTED}`],
    ['/marketplace?q=shoes', '/marketplace?q=shoes'],
  ])('%s', (input, expected) => {
    expect(redactUrl(input)).toBe(expected);
  });
});

describe('Sentry privacy options', () => {
  it('scrubs events and breadcrumbs, with default PII off', () => {
    expect(sentryPrivacyOptions.sendDefaultPii).toBe(false);
    const event = {
      request: { url: `https://app.example/order/${TOKEN}`, headers: { Cookie: 'refresh_token=x' } },
      user: { id: 'u1', email: 'person@example.test' },
      breadcrumbs: [{ category: 'navigation', data: { from: '/', to: `/order/${TOKEN}` } }],
    };
    const out = JSON.stringify(sentryPrivacyOptions.beforeSend(scrubSentryEvent(event)));
    expect(out).not.toContain(TOKEN);
    expect(out).not.toContain('person@example.test');
    expect(out).not.toContain('refresh_token=x');
    expect(JSON.stringify(sentryPrivacyOptions.beforeBreadcrumb({ message: `GET /order/${TOKEN}` }))).not.toContain(TOKEN);
  });

});
