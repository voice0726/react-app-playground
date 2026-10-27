import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { fetchSession } from '@/lib/auth'
import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'
import { parseSearchPreservingRawQuery } from '@/lib/searchParams'

const router = createRouter({ routeTree, parseSearch: parseSearchPreservingRawQuery })
declare module '@tanstack/react-router' { interface Register { router: typeof router } }

async function startMockWorker(): Promise<void> {
  // MODE はビルド時に定数へ置換されるため、本番ビルドからはモックが取り除かれる
  const usePreviewMock = import.meta.env.MODE === 'preview'
  const useDevMock = import.meta.env.DEV && import.meta.env.VITE_USE_MSW === 'true'
  if (!usePreviewMock && !useDevMock) return
  const { worker } = await import('@/mocks/browser')
  await worker.start({ onUnhandledFrame: 'bypass' })
}

async function restoreSession(): Promise<void> {
  const result = await fetchSession()
  if (result.status === 'authenticated') useSessionStore.getState().setSession(result.user)
  else useSessionStore.getState().setStatus(result.status)
}

function BootstrapGate() {
  const status = useSessionStore((state) => state.status)
  if (status === 'loading') return <div>読み込み中…</div>
  if (status === 'unavailable') return <div>認証サービスに接続できません。<button onClick={() => window.location.reload()}>再試行</button></div>
  return <RouterProvider router={router} />
}

async function bootstrap(): Promise<void> {
  await startMockWorker()
  const root = document.getElementById('root')
  if (root === null) throw new Error('Root element #root was not found')
  createRoot(root).render(<StrictMode><BootstrapGate /></StrictMode>)
  await restoreSession()
}

void bootstrap()
