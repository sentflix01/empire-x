import { test, expect, request } from '@playwright/test';

const API = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const FRONTEND = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002';
const EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-buyer@nodbusiness.test';
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'TestCodexE2E2026!';

test('one Real identity switches into and back from its isolated Demo workspace', async () => {
  test.skip(process.env.E2E_DEMO_WORKSPACE !== 'true', 'Requires provisioned, enabled Demo schema and E2E credentials.');
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
    const realMe = await realMeResponse.json() as { id: string; email: string; demo_workspace_available: boolean };
    expect(realMe.demo_workspace_available).toBe(true);

    const enterDemo = await context.post('/api/auth/workspace', {
      data: { workspace: 'demo' },
      headers: { Authorization: `Bearer ${realAuth.access_token}`, Origin: origin },
    });
    expect(enterDemo.ok()).toBeTruthy();
    const demoAuth = await enterDemo.json() as { access_token: string; workspace: string };
    expect(demoAuth.workspace).toBe('demo');
    const demoMeResponse = await context.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${demoAuth.access_token}`, Origin: origin },
    });
    expect(demoMeResponse.ok()).toBeTruthy();
    const demoMe = await demoMeResponse.json() as { id: string; email: string; is_demo: boolean; demo_session_active: boolean };
    expect(demoMe.id).toBe(realMe.id);
    expect(demoMe.email).toBe(realMe.email);
    expect(demoMe.is_demo).toBe(true);
    expect(demoMe.demo_session_active).toBe(true);

    const returnReal = await context.post('/api/auth/workspace', {
      data: { workspace: 'real' },
      headers: { Authorization: `Bearer ${demoAuth.access_token}`, Origin: origin },
    });
    expect(returnReal.ok()).toBeTruthy();
    const realAgain = await returnReal.json() as { access_token: string; workspace: string };
    expect(realAgain.workspace).toBe('real');
    const realAgainMe = await context.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${realAgain.access_token}` },
    });
    expect(realAgainMe.ok()).toBeTruthy();
    expect((await realAgainMe.json() as { id: string; demo_session_active: boolean })).toMatchObject({
      id: realMe.id,
      demo_session_active: false,
    });
  } finally {
    await context.dispose();
  }
});
