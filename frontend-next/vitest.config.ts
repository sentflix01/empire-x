import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    passWithNoTests: true,
    // Playwright E2E lives in e2e/ and runs via `npm run test:e2e`, not vitest.
    exclude: ['**/node_modules/**', 'e2e/**', 'playwright.config.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
