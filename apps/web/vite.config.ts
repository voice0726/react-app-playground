import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendURL = env.VITE_BACKEND_URL ?? 'http://localhost:8080'
  const authGatewayURL = env.VITE_AUTH_GATEWAY_URL ?? 'http://localhost:4000'
  return {
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/routes',
    }),
    react(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
    server: { proxy: { '/api/healthz': { target: backendURL, changeOrigin: true, rewrite: () => '/healthz' }, '/api': { target: backendURL, changeOrigin: true }, '/auth': { target: authGatewayURL, changeOrigin: true, secure: false } } },
  }
})
