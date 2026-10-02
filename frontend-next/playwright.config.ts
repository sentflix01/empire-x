import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E — TD-003 (critical user flows)
 *
 * Full-stack local run:
 *   backend/.env must exist (DATABASE_URL etc.) and the DB should be seeded:
 *     cd ../backend && npm run migrate && npm run seed
 *   Then: npm run test:e2e   (from frontend-next/)
 *
 * The two web servers below reuse already-running instances locally
 * (reuseExistingServer) so you can keep `npm run dev` sessions up.
 */

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 15_000 }, // generous — dev-mode lazy compilation on first hit
  fullyParallel: false, // shared DB state — keep runs deterministic
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.E2E_CHROME_PATH
      ? { launchOptions: { executablePath: process.env.E2E_CHROME_PATH } }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    ...(process.env.E2E_SKIP_BACKEND === 'true' ? [] : [{
      command: 'npm run dev',
      cwd: path.resolve(__dirname, '../backend'),
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    }]),
    {
      command: 'npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
