/**
 * Credentials in URLs never reach logs, error_events or Sentry (audit F-015).
 */
import express from 'express';
import request from 'supertest';
import pool from '../db/pool';
import logger from '../lib/logger';
import httpLogger from '../middleware/httpLogger';
import { captureError } from '../lib/errorCollector';
import { redactUrl, redactPath, scrubSentryEvent, scrubSentryBreadcrumb, REDACTED } from '../lib/redact';
import { sentryPrivacyOptions } from '../lib/sentry';

jest.mock('../db/pool', () => {
  const pool = { query: jest.fn() };
  return { __esModule: true, default: pool };
});

const TOKEN = 'Zk3vQ9-secret-guest-token_abcdefghijklmnopqrstuvwxyz';

describe('redactUrl', () => {
  it.each([
    [`/api/direct-orders/link/${TOKEN}`, `/api/direct-orders/link/${REDACTED}`],
    [`/api/direct-orders/link/${TOKEN}/receipt`, `/api/direct-orders/link/${REDACTED}/receipt`],
    [`https://app.example/order/${TOKEN}?tab=pay`, `https://app.example/order/${REDACTED}?tab=pay`],
    ['/api/private-files/verification/u1/a.png?expires=1793999999&signature=abc123', `/api/private-files/${REDACTED}?expires=1793999999&signature=${REDACTED}`],
    ['/uploads/demo/x.png?demo_asset=jwt.value.here', `/uploads/demo/x.png?demo_asset=${REDACTED}`],
    ['/api/auth/google/callback?code=4/abc&state=xyz', `/api/auth/google/callback?code=${REDACTED}&state=xyz`],
    ['/reset-password?Token=abc', `/reset-password?Token=${REDACTED}`],
    ['/api/products?limit=20&cursor=abc', '/api/products?limit=20&cursor=abc'],
    ['/api/products/123', '/api/products/123'],
  ])('%s', (input, expected) => {
    expect(redactUrl(input)).toBe(expected);
  });

  it('drops fragments and handles empty values', () => {
    expect(redactUrl('/a?token=1#frag')).toBe(`/a?token=${REDACTED}`);
    expect(redactUrl('')).toBe('');
    expect(redactPath(`/api/direct-orders/link/${TOKEN}?x=1`)).toBe(`/api/direct-orders/link/${REDACTED}`);
  });
});

describe('HTTP access log', () => {
  it('records the redacted URL', async () => {
    const info = jest.spyOn(logger, 'info').mockImplementation(() => undefined as never);
    const app = express();
    app.use(httpLogger);
    app.get('/api/direct-orders/link/:token', (_req, res) => { res.json({ ok: true }); });
    await request(app).get(`/api/direct-orders/link/${TOKEN}?signature=s3cr3t`);
    const logged = JSON.stringify(info.mock.calls);
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain('s3cr3t');
    expect(logged).toContain(`/api/direct-orders/link/${REDACTED}`);
    info.mockRestore();
  });
});

describe('error_events', () => {
  it('stores the redacted path', async () => {
    const query = (pool as unknown as { query: jest.Mock }).query;
    query.mockReset().mockResolvedValue({ rows: [] });
    const req = { method: 'GET', originalUrl: `/api/direct-orders/link/${TOKEN}/receipt?x=1`, path: `/link/${TOKEN}/receipt`, headers: {} };
    await captureError(new Error('boom'), { req: req as never });
    const params = query.mock.calls[0][1] as unknown[];
    expect(JSON.stringify(params)).not.toContain(TOKEN);
    expect(params[5]).toBe(`/api/direct-orders/link/${REDACTED}/receipt`);
  });
});

describe('Sentry scrubbing', () => {
  it('removes credentials from events, transactions and breadcrumbs', () => {
    const event = {
      transaction: `GET /api/direct-orders/link/${TOKEN}`,
      request: {
        url: `https://api.example/api/direct-orders/link/${TOKEN}?signature=s3cr3t`,
        query_string: 'signature=s3cr3t&page=2',
        headers: { Authorization: 'Bearer abc', Cookie: 'refresh_token=xyz', 'User-Agent': 'test' },
        cookies: { refresh_token: 'xyz' },
        data: { password: 'p' },
      },
      user: { id: 'u1', email: 'person@example.test', ip_address: '1.2.3.4' },
      breadcrumbs: [{ category: 'fetch', data: { url: `/order/${TOKEN}` }, message: `GET /order/${TOKEN}` }],
    };
    const out = JSON.stringify(scrubSentryEvent(event));
    for (const secret of [TOKEN, 's3cr3t', 'Bearer abc', 'refresh_token=xyz', 'person@example.test', '1.2.3.4', '"password"']) {
      expect(out).not.toContain(secret);
    }
    expect(event.request.query_string).toBe(`signature=${REDACTED}&page=2`);
    expect(event.request.headers['User-Agent']).toBe('test');
    expect(event.user).toEqual({ id: 'u1' });
    expect(scrubSentryBreadcrumb({ data: { to: `/order/${TOKEN}` } })).toEqual({ data: { to: `/order/${REDACTED}` } });
  });

  it('is wired into the Sentry options with default PII off', () => {
    expect(sentryPrivacyOptions.sendDefaultPii).toBe(false);
    expect(JSON.stringify(sentryPrivacyOptions.beforeSend({ transaction: `/order/${TOKEN}` }))).not.toContain(TOKEN);
  });
});
