import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PLAYWRIGHT_PORT || '3100')
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('PLAYWRIGHT_PORT must be an integer from 1 to 65535')
const baseURL = `http://127.0.0.1:${port}`
const channel = process.env.PLAYWRIGHT_CHANNEL

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], ...(channel ? { channel } : {}) },
    },
  ],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    // Avoid silently testing another checkout that happens to own the port.
    reuseExistingServer:
      !process.env.CI && process.env.PLAYWRIGHT_REUSE_SERVER === 'true',
    timeout: 120_000,
    env: {
      PARTNER_ADS_FEEDS: '',
      PARTNER_ADS_PARTNER_ID: '',
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
})
