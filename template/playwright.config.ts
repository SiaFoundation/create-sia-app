import { defineConfig, devices } from '@playwright/test'

const CI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A stray `test.only` would pass CI while running a single test.
  forbidOnly: CI,
  // A test that only passes on retry is flaky, and retries hide that.
  retries: 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: false,
  },
})
