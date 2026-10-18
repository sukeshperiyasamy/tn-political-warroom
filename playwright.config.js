// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000',
      port: 8000,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'npm run start --prefix frontend',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
