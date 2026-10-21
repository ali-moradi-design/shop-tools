import { defineConfig, devices } from '@playwright/test';

/**
 * E2E against a running stack: API on :4000 (seeded) and the production web
 * build on :3000. CI starts both before running `pnpm e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH && {
      launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH },
    }),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
