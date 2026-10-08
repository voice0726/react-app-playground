import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@/mocks/server'
import { resetMockState } from '@/mocks/handlers'
import { queryClient } from '@/lib/queryClient'

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

Object.defineProperty(window, 'scrollTo', { writable: true, value: () => {} })

Object.defineProperty(document, 'fonts', {
  configurable: true,
  value: { addEventListener: () => {}, removeEventListener: () => {} },
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverMock })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockState()
  queryClient.clear()
  cleanup()
})
afterAll(() => server.close())
