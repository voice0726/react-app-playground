import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendURL = env.VITE_BACKEND_URL ?? 'http://localhost:18080'
  const authGatewayURL = env.VITE_AUTH_GATEWAY_URL ?? 'http://localhost:8800'
  return {
  plugins: [
    tanstackRouter({
      target: 'react',
      routesDirectory: './src/routes',
      // Vitest でルートを遅延読み込みすると、初回描画が findBy の既定タイムアウトを超える
      autoCodeSplitting: mode !== 'test',
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
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      allowedHosts: ['react.localtest.me'],
      proxy: {
        '/api/healthz': { target: backendURL, changeOrigin: true, rewrite: () => '/healthz' },
        '/api': { target: backendURL, changeOrigin: true },
        '/auth': {
          target: authGatewayURL,
          changeOrigin: true,
          secure: false,
          headers: { 'X-App-Id': 'react-app-playground' },
        },
      },
    },
  }
})
