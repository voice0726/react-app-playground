import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import { afterEach, expect, it, vi } from 'vitest'

import { useKanbanStore } from '@/features/tasks/stores/kanban.store'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
import { MOCK_EDITOR_ORGANIZATION_ID, MOCK_ORGANIZATION_ID, MOCK_VIEWER_ORGANIZATION_ID } from '@/mocks/handlers/organizations'
import { server } from '@/mocks/server'
import { routeTree } from '@/routeTree.gen'

function renderRoute(path: string) {
  useSessionStore.getState().setSession({ id: '1', name: 'User', email: 'user@example.com' })
  const router = createRouter({ routeTree, history: createMemoryHistory({ initialEntries: [path] }) })
  render(<RouterProvider router={router} />)
  return router
}

afterEach(() => {
  vi.restoreAllMocks()
  useSessionStore.getState().clearSession()
  useKanbanStore.setState({ tasks: [], activeTaskId: null })
})

it('組織切り替えで通信を中止し、キャッシュとタスクの選択を破棄する', async () => {
  let started = false
  const fetchSpy = vi.spyOn(globalThis, 'fetch')
  let releaseResponse!: () => void
  server.use(http.get('*/api/customers', async () => {
    started = true
    await new Promise<void>((resolve) => {
      releaseResponse = resolve
    })
    return HttpResponse.json([])
  }))
  const router = renderRoute('/customers')
  await waitFor(() => expect(started).toBe(true))
  queryClient.setQueryData(['tickets', 'detail', MOCK_ORGANIZATION_ID, 1], { title: '古いチケット' })
  queryClient.setQueryData(['organizations', MOCK_ORGANIZATION_ID, 'members'], [{ userId: '1', role: 'admin' }])
  useKanbanStore.setState({ activeTaskId: 'task-001', tasks: [{ id: 'task-001', title: '古いタスク', description: '', status: 'TODO', createdAt: '2026-01-01' }] })

  fireEvent.click(await screen.findByRole('combobox', { name: '組織' }))
  fireEvent.click(await screen.findByText('閲覧者の組織', { exact: true }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'))
  const pendingFetch = fetchSpy.mock.calls.find(([url]) => String(url).startsWith('/api/customers'))
  expect(pendingFetch?.[1]?.signal?.aborted).toBe(true)
  releaseResponse()
  expect(queryClient.getQueryCache().getAll().some((query) => query.queryKey.includes(MOCK_ORGANIZATION_ID))).toBe(false)
  expect(useKanbanStore.getState()).toMatchObject({ tasks: [], activeTaskId: null })
  expect(sessionStorage.getItem('playground:organization:1')).toBe(MOCK_VIEWER_ORGANIZATION_ID)
  expect(await screen.findByText('権限: 閲覧者')).toBeTruthy()
})

it('組織の新規作成でも以前の組織のキャッシュを破棄する', async () => {
  const router = renderRoute('/dashboard')
  await screen.findByText('権限: 管理者')
  queryClient.setQueryData(['tickets', 'detail', MOCK_ORGANIZATION_ID, 1], { title: '古いチケット' })
  fireEvent.click(screen.getByRole('button', { name: '組織を作成' }))
  fireEvent.change(await screen.findByLabelText('組織名'), { target: { value: '新しい組織' } })
  fireEvent.click(screen.getByRole('button', { name: '作成する' }))
  await waitFor(() => expect(sessionStorage.getItem('playground:organization:1')).toBeTruthy())
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(router.state.location.pathname).toBe('/dashboard')
  expect(queryClient.getQueryCache().getAll().some((query) => query.queryKey.includes(MOCK_ORGANIZATION_ID))).toBe(false)
})

it.each([false, true])('一覧の先頭に組織が追加されても初期選択を保つ（保存不可: %s）', async (storageUnavailable) => {
  if (storageUnavailable) {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage unavailable') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable') })
  }
  const initialOrganization = { id: MOCK_ORGANIZATION_ID, name: 'A', role: 'admin' }
  const newOrganization = { id: '00000000-0000-4000-8000-000000000004', name: '0-new-membership', role: 'editor' }
  let memberships = [initialOrganization, { id: MOCK_EDITOR_ORGANIZATION_ID, name: 'B', role: 'editor' }]
  server.use(http.get('*/api/organizations', () => HttpResponse.json(memberships)))
  const router = renderRoute('/tasks')
  const selector = await screen.findByRole('combobox', { name: '組織' })
  await waitFor(() => expect((selector as HTMLInputElement).value).toBe('A'))
  await screen.findByText('Review Acme contract')
  act(() => useKanbanStore.setState({ activeTaskId: 'task-001' }))
  const taskKey = ['tasks', 'list', MOCK_ORGANIZATION_ID]
  const cachedTasks = queryClient.getQueryData(taskKey)
  expect(cachedTasks).toBeDefined()

  memberships = [newOrganization, ...memberships]
  await act(async () => {
    await queryClient.invalidateQueries({ queryKey: ['organizations', '1'] })
  })

  await waitFor(() => expect(queryClient.getQueryData<{ id: string }[]>(['organizations', '1'])?.[0]?.id).toBe(newOrganization.id))
  expect((screen.getByRole('combobox', { name: '組織' }) as HTMLInputElement).value).toBe('A')
  expect(router.state.location.pathname).toBe('/tasks')
  expect(useKanbanStore.getState().activeTaskId).toBe('task-001')
  expect(queryClient.getQueryData(taskKey)).toBe(cachedTasks)
  expect(queryClient.getQueryCache().getAll().some((query) => query.queryKey.includes(newOrganization.id))).toBe(false)
  if (!storageUnavailable) expect(sessionStorage.getItem('playground:organization:1')).toBe(MOCK_ORGANIZATION_ID)
})
