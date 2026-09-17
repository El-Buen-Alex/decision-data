import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  // Inicia sesión una sola vez para toda la corrida (ver global-setup.ts) en vez
  // de una vez por test — /auth/login tiene rate limiting real (20 req/60s) y una
  // corrida completa haciendo login por cada test lo agota.
  globalSetup: require.resolve('./e2e/global-setup'),
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    storageState: 'e2e/.auth/demo-user.json',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
});
