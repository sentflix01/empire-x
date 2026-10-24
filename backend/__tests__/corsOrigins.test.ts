import express from 'express';
import request from 'supertest';
import { allowedOrigins, originMatcher, requireTrustedOrigin } from '../lib/corsOrigins';

describe('CORS allow-list (audit SEC-08)', () => {
  it('trusts only the configured origins in production', () => {
    expect(allowedOrigins({ NODE_ENV: 'production', FRONTEND_URL: 'https://nodbusiness.vercel.app' }))
      .toEqual(['https://nodbusiness.vercel.app']);
  });

  it('never adds the unowned nodbusiness.app domain', () => {
    for (const env of [
      { NODE_ENV: 'production', FRONTEND_URL: 'https://nodbusiness.vercel.app' },
      { NODE_ENV: 'production' },
      { NODE_ENV: 'development', FRONTEND_URL: 'http://localhost:3002' },
    ]) {
      expect(allowedOrigins(env as NodeJS.ProcessEnv)).not.toContain('https://nodbusiness.app');
    }
  });

  it('adds the local dev frontend outside production only', () => {
    expect(allowedOrigins({ NODE_ENV: 'development', FRONTEND_URL: 'https://example.test' })).toContain('http://localhost:3002');
    expect(allowedOrigins({ NODE_ENV: 'production', FRONTEND_URL: 'https://example.test' })).not.toContain('http://localhost:3002');
  });

  it('matches wildcard entries within one host label set, not across paths', () => {
    const trusted = originMatcher(['https://nodbusiness.vercel.app', 'https://nodbusiness-*.vercel.app']);
    expect(trusted('https://nodbusiness.vercel.app')).toBe(true);
    expect(trusted('https://nodbusiness-git-fix-x.vercel.app')).toBe(true);
    expect(trusted('https://nodbusiness.app')).toBe(false);
    expect(trusted('https://evil.example/nodbusiness-x.vercel.app')).toBe(false);
    expect(trusted('https://nodbusiness-x.evil.example.vercel.app')).toBe(false);
  });
});

describe('requireTrustedOrigin', () => {
  const app = express();
  app.post('/refresh', requireTrustedOrigin(originMatcher(['https://nodbusiness.vercel.app'])), (_req, res) => { res.json({ ok: true }); });

  it('lets the configured frontend refresh', async () => {
    const res = await request(app).post('/refresh').set('Origin', 'https://nodbusiness.vercel.app');
    expect(res.status).toBe(200);
  });

  it('refuses a foreign origin before the session is touched', async () => {
    const res = await request(app).post('/refresh').set('Origin', 'https://nodbusiness.app');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ORIGIN_NOT_ALLOWED');
  });

  it('allows requests without an Origin header (server-to-server, same-origin)', async () => {
    const res = await request(app).post('/refresh');
    expect(res.status).toBe(200);
  });
});
