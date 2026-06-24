import type { KnipConfig } from 'knip'

const config: KnipConfig = {
  workspaces: {
    'apps/web': {
      entry: ['src/routes/**/*.tsx'],
      project: ['src/**/*.{ts,tsx}'],
    },
  },
}

export default config
