import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:3100'
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
    command:
      'node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PARTNER_ADS_FEEDS: '',
      PARTNER_ADS_PARTNER_ID: '',
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
})
