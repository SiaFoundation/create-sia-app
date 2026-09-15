import { defineConfig, devices } from '@playwright/test'

const CI = Boolean(process.env.CI)

// Every test runs against both servers. The production build is what users
// get; the dev server runs React StrictMode's double effects, which is where a
// second waitForApproval() call on the same Builder would show up.
const PREVIEW_URL = 'http://localhost:4173'
const DEV_URL = 'http://localhost:4174'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A stray `test.only` would pass CI while running a single test.
  forbidOnly: CI,
  // A test that only passes on retry is flaky, and retries hide that. The
  // budgets below are generous instead: a page load fetches and compiles the
  // WASM module, and the SDK checks for approval every 5 seconds.
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'preview',
      use: { ...devices['Desktop Chrome'], baseURL: PREVIEW_URL },
    },
    {
      name: 'dev',
      use: { ...devices['Desktop Chrome'], baseURL: DEV_URL },
    },
  ],
  webServer: [
    {
      command: 'bun run build && bun run preview',
      url: PREVIEW_URL,
      reuseExistingServer: false,
    },
    {
      command: 'bun run dev --port 4174',
      url: DEV_URL,
      reuseExistingServer: false,
    },
  ],
})
