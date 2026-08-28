import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: '../../tests',
  testMatch: '**/*.backend.spec.ts',
  globalSetup: '../../tests/global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: { baseURL: 'http://localhost:5173', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'VITE_USE_MSW=false pnpm --filter @playground/web dev --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
