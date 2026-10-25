import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { e2eTargetProblem } from './e2e/target-guard';

/**
 * Playwright E2E — TD-003 (critical user flows)
 *
 * Full-stack local run:
 *   backend/.env must exist with a LOCAL DATABASE_URL, and the DB seeded:
 *     cd ../backend && npm run migrate && ALLOW_E2E_SEED=1 npm run seed:e2e
 *   Then: npm run test:e2e   (from frontend-next/)
 *
 * The specs write data. e2e/target-guard.ts refuses to start when the backend
 * URL or its DATABASE_URL points anywhere but this machine (audit DATA-03).
 *
 * The two web servers below reuse already-running instances locally
 * (reuseExistingServer) so you can keep `npm run dev` sessions up.
 *
 * Two-person messaging (e2e/messaging.spec.ts, phone/iPhone/tablet/desktop):
 *   ALLOW_E2E_SEED=1 E2E_MESSAGING_PASSWORD=<16+ chars> npx playwright test --project='messaging-*'
 *   The spec reseeds its three accounts before each device run (db/seed-e2e-messaging.js).
 */

// Checked when the config loads, before Playwright starts any web server: a
// backend started against a hosted database would already run its jobs there.
const targetProblem = e2eTargetProblem();
if (targetProblem) throw new Error(`E2E refused: ${targetProblem}`);

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? 'http://localhost:3001';
const FRONTEND_URL = process.env.E2E_FRONTEND_URL ?? 'http://localhost:3002';
const FRONTEND_PORT = new URL(FRONTEND_URL).port || '3002';
// An installed Chrome instead of Playwright's Chromium (Chromium projects only; WebKit can't use it).
const chrome = process.env.E2E_CHROME_PATH ? { launchOptions: { executablePath: process.env.E2E_CHROME_PATH } } : {};

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
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...chrome },
      // The two-person messaging suite has its own device projects below.
      testIgnore: /messaging\.spec\.ts/,
    },
    // Messaging M7: the same two-person flows on a phone, an iPhone, a tablet
    // and a computer. Chromium projects use the installed Chrome when
    // E2E_CHROME_PATH is set; the Apple devices run on WebKit.
    { name: 'messaging-phone', testMatch: /messaging\.spec\.ts/, use: { ...devices['Pixel 7'], ...chrome } },
    { name: 'messaging-iphone', testMatch: /messaging\.spec\.ts/, use: { ...devices['iPhone 14'] } },
    { name: 'messaging-tablet', testMatch: /messaging\.spec\.ts/, use: { ...devices['iPad Mini'] } },
    { name: 'messaging-desktop', testMatch: /messaging\.spec\.ts/, use: { ...devices['Desktop Chrome'], ...chrome } },
  ],
  webServer: [
    ...(process.env.E2E_SKIP_BACKEND === 'true' ? [] : [{
      command: 'npm run dev',
      cwd: path.resolve(__dirname, '../backend'),
      url: `${BACKEND_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    }]),
    // E2E_SKIP_FRONTEND: a frontend you started yourself (CI runs a production build).
    ...(process.env.E2E_SKIP_FRONTEND === 'true' ? [] : [{
      command: `npm run dev -- --port ${FRONTEND_PORT}`,
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    }]),
  ],
});
