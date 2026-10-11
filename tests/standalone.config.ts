import { defineConfig, devices } from '@playwright/test'

const appOrigin = 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.standalone.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  use: { baseURL: appOrigin, trace: 'retain-on-failure', actionTimeout: 10000, navigationTimeout: 10000 },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'VITE_USE_MSW=true VITE_DISABLE_DEVTOOLS=true pnpm --filter @playground/web dev --host 127.0.0.1 --port 5173',
    url: appOrigin,
    reuseExistingServer: false,
  },
})
