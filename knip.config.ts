import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    '.': {
      entry: ['tests/backend-integration.config.ts', 'tests/global-setup.ts', 'tests/**/*.backend.spec.ts'],
      project: ['tests/**/*.ts'],
    },
    'apps/web': {
      entry: ['src/routes/**/*.tsx'],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: ['cloudflare'],
    },
  },
}

export default config
