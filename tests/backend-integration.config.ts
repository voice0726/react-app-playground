import { defineConfig, devices } from '@playwright/test'
import { appOrigin } from './helpers/auth'

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.backend.spec.ts',
  globalSetup: './global-setup.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  use: { baseURL: appOrigin, trace: 'retain-on-failure', actionTimeout: 10000, navigationTimeout: 10000 },
  projects: [
    { name: 'chromium', testIgnore: '**/logout.backend.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'logout', testMatch: '**/logout.backend.spec.ts', dependencies: ['chromium'], use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'VITE_USE_MSW=false VITE_DISABLE_DEVTOOLS=true pnpm --filter @playground/web dev',
    url: appOrigin,
    reuseExistingServer: false,
  },
})
