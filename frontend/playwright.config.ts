import { defineConfig, devices } from '@playwright/test'

// End-to-end smoke tests against the production build in demo mode (no backend needed).
// CI: `pnpm exec playwright install --with-deps chromium` then `pnpm e2e`.
// Locally without downloading browsers: `PW_CHANNEL=msedge pnpm e2e` uses the installed Edge.
const PORT = 4180

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Pixel 7'],
    channel: process.env.PW_CHANNEL || undefined,
    locale: 'en-GB',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
