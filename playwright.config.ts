import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['line'], ['html', { open: 'never', outputFolder: 'output/playwright/report' }]]
    : 'line',
  outputDir: 'output/playwright/results',
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:5000',
    ...devices['Pixel 5'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5000/api/ping',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
