import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { useSessionStore, type SessionUser } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'

type SessionResponse = {
  user?: SessionUser
}

const router = createRouter({
  routeTree,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function isSessionResponse(value: unknown): value is SessionResponse {
  return (
    value !== null &&
    typeof value === 'object' &&
    'user' in value &&
    typeof (value as SessionResponse).user?.id === 'string' &&
    typeof (value as SessionResponse).user?.name === 'string' &&
    typeof (value as SessionResponse).user?.email === 'string'
  )
}

async function startMockWorker(): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }

  const { worker } = await import('@/mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
  })
}

async function restoreSession(): Promise<void> {
  try {
    const response = await fetch('/api/auth/get-session')

    if (!response.ok) {
      return
    }

    const session = (await response.json()) as unknown

    if (isSessionResponse(session) && session.user !== undefined) {
      useSessionStore.getState().setSession(session.user)
    }
  } catch {
    useSessionStore.getState().clearSession()
  }
}

async function bootstrap(): Promise<void> {
  await startMockWorker()
  await restoreSession()

  const rootElement = document.getElementById('root')

  if (rootElement === null) {
    throw new Error('Root element #root was not found')
  }

  createRoot(rootElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  )
}

void bootstrap()
