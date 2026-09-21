import { defineConfig, devices } from '@playwright/test';

// #region Real-API browser checks
// Start an isolated Spring instance first (see README). Playwright only launches
// the frontend. Unique accounts prevent tests from depending on existing data.
// The optional executable path supports an existing local Chromium installation.
// #endregion
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    env: { API_PROXY_TARGET: process.env.API_PROXY_TARGET || 'http://127.0.0.1:18080' },
  },
});
