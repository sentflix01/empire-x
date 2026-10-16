import { test, expect, request } from '@playwright/test';

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002';
const EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-buyer@nodbusiness.test';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestCodexE2E2026!';

test('a Real identity cannot enter Demo until it has logged out', async () => {
  test.skip(!process.env.E2E_TEST_EMAIL || !process.env.E2E_TEST_PASSWORD, 'Requires E2E credentials for an existing Real account.');
  const context = await request.newContext({ baseURL: API });
  const origin = new URL(FRONTEND).origin;
  try {
    const login = await context.post('/api/auth/login', { data: { email: EMAIL, password: PASSWORD } });
    expect(login.ok()).toBeTruthy();
    const realAuth = await login.json() as { access_token: string; is_demo: boolean };
    expect(realAuth.is_demo).toBe(false);
    const realMeResponse = await context.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${realAuth.access_token}` },
    });
    expect(realMeResponse.ok()).toBeTruthy();
    const realMe = await realMeResponse.json() as { id: string; email: string };

    const enterDemo = await context.post('/api/auth/workspace', {
      data: { workspace: 'demo' },
      headers: { Authorization: `Bearer ${realAuth.access_token}`, Origin: origin },
    });
    expect(enterDemo.status()).toBe(410);
    expect((await enterDemo.json() as { code: string }).code).toBe('SEPARATE_DEMO_SESSION_REQUIRED');
    const realStillActive = await context.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${realAuth.access_token}` },
    });
    expect(realStillActive.ok()).toBeTruthy();
    expect((await realStillActive.json() as { id: string; email: string; demo_session_active: boolean })).toMatchObject({
      id: realMe.id,
      email: realMe.email,
      demo_session_active: false,
    });
  } finally {
    await context.dispose();
  }
});
