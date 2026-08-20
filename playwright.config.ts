import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['./tests/e2e/a10/acceptance-reporter.ts']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'functional-1280',
      testIgnore: /a10-responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'responsive-390',
      testMatch: /a10-responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
    {
      name: 'responsive-1024',
      testMatch: /a10-responsive\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    env: {
      ...process.env,
      VITE_USE_EMULATORS: 'true',
    },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
  },
});
