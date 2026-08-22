import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from '@/mocks/server'
import { resetMockState } from '@/mocks/handlers'
import { queryClient } from '@/lib/queryClient'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  resetMockState()
  queryClient.clear()
  cleanup()
})
afterAll(() => server.close())
