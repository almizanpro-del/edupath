/**
 * Playwright E2E configuration.
 *
 * Smoke-level config: one browser (Chromium), one project, retries on CI.
 * Goal is to catch the catastrophic regressions (blank page, broken auth
 * modal, broken navigation) without slowing down the dev loop with a
 * huge suite. As the app matures we can split into multiple projects
 * (desktop / mobile) and add per-feature specs.
 *
 * Run locally:
 *   npx playwright test                # headless, all tests
 *   npx playwright test --headed       # show the browser
 *   npx playwright test --ui           # interactive mode
 *
 * CI:
 *   The GitHub Actions workflow runs `npx playwright test` after the
 *   vitest unit/integration suite.
 */
import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Run the local dev server before the tests if PLAYWRIGHT_BASE_URL
  // is not set. On CI we typically point at a preview deployment instead.
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: 'ignore',
        stderr: 'pipe',
      },
})
