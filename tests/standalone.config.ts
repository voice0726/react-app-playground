import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_STANDALONE_PORT ?? '5173')
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid E2E_STANDALONE_PORT')
const appOrigin = `http://127.0.0.1:${port}`

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
    command: `VITE_USE_MSW=true VITE_DISABLE_DEVTOOLS=true pnpm --filter @playground/web dev --host 127.0.0.1 --port ${port}`,
    url: appOrigin,
    reuseExistingServer: false,
  },
})
