import { defineConfig } from '@playwright/test'
import standalone from './standalone.config'

export default defineConfig({
  ...standalone,
  testMatch: '**/*.visual.spec.ts',
  globalSetup: './visual-setup.ts',
  snapshotPathTemplate: '{testDir}/screenshots/linux/{projectName}/{arg}{ext}',
  updateSnapshots: 'none',
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixels: 0 },
  },
  use: {
    ...standalone.use,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
  },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})
