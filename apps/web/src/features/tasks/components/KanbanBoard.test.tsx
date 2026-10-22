import { TestOrganization } from '@/test/organization'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { useKanbanStore } from '@/features/tasks/stores/kanban.store'
import { KanbanBoard } from '@/features/tasks/components/KanbanBoard'
import type { Task, TaskStatus } from '@/features/tasks/types'
import { server } from '@/mocks/server'

const tasks: Task[] = [
  { id: 'task-a', title: 'Task A', description: 'First task', status: 'TODO', createdAt: '2026-01-01' },
  { id: 'task-b', title: 'Task B', description: 'Second task', status: 'TODO', createdAt: '2026-01-02' },
]

function renderBoard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}><TestOrganization>
      <MantineProvider>
        <KanbanBoard />
      </MantineProvider>
    </TestOrganization></QueryClientProvider>,
  )
}

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: () => undefined })

async function chooseStatus(taskTitle: string, status: TaskStatus) {
  const select = screen.getByRole('combobox', { name: `${taskTitle} を移動` })
  fireEvent.change(select, { target: { value: status } })
}

beforeEach(() => useKanbanStore.setState({ tasks, activeTaskId: null }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})

describe('KanbanBoard', () => {
  it('blocks another task move while the first save is pending', async () => {
    let patchStarted = false
    let patchCompleted = false
    server.use(
      http.patch('*/api/tasks/:id', async ({ params }) => {
        patchStarted = true
        await delay(100)
        patchCompleted = true
        return HttpResponse.json({ ...tasks[0], id: String(params.id), status: 'IN_PROGRESS' })
      }),
    )
    renderBoard()

    await chooseStatus('Task A', 'IN_PROGRESS')
    await waitFor(() => expect(patchStarted).toBe(true))
    expect(screen.getByRole('combobox', { name: 'Task B を移動' }).hasAttribute('disabled')).toBe(true)
    expect(useKanbanStore.getState().tasks.find((task) => task.id === 'task-a')?.status).toBe('IN_PROGRESS')

    await waitFor(() => expect(patchCompleted).toBe(true))
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Task B を移動' }).hasAttribute('disabled')).toBe(false))
  })

  it('restores only the failed move and accepts a later successful move', async () => {
    let requestCount = 0
    server.use(
      http.patch('*/api/tasks/:id', ({ params, request }) => {
        requestCount += 1
        if (requestCount === 1) return new HttpResponse(null, { status: 500 })
        return request.json().then((body) =>
          HttpResponse.json({ ...tasks[0], id: String(params.id), status: (body as { status: Task['status'] }).status }),
        )
      }),
    )
    renderBoard()

    await chooseStatus('Task A', 'IN_PROGRESS')
    expect((await screen.findByRole('alert')).textContent).toContain('タスクの状態を保存できませんでした')
    expect(useKanbanStore.getState().tasks.map((task) => task.status)).toEqual(['TODO', 'TODO'])

    await chooseStatus('Task A', 'DONE')
    await waitFor(() => expect(useKanbanStore.getState().tasks[0]?.status).toBe('DONE'))
    expect(requestCount).toBe(2)
  })

  it('saves a status selected through the keyboard-accessible native control', async () => {
    server.use(
      http.patch('*/api/tasks/:id', ({ params }) =>
        HttpResponse.json({ ...tasks[0], id: String(params.id), status: 'DONE' }),
      ),
    )
    renderBoard()

    const select = screen.getByRole('combobox', { name: 'Task A を移動' })
    select.focus()
    fireEvent.keyDown(select, { key: 'ArrowDown' })
    fireEvent.change(select, { target: { value: 'DONE' } })

    await waitFor(() => expect(useKanbanStore.getState().tasks[0]?.status).toBe('DONE'))
  })

  it('shows a create error, keeps entered values, and allows retry', async () => {
    let requestCount = 0
    server.use(
      http.post('*/api/tasks', async ({ request }) => {
        requestCount += 1
        const body = await request.json() as { title: string; description: string; status: Task['status'] }
        if (requestCount === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json({ ...body, id: 'task-created', createdAt: '2026-01-03' }, { status: 201 })
      }),
    )
    renderBoard()
    fireEvent.click(screen.getByRole('button', { name: '未着手にタスクを追加' }))
    await screen.findByText('新規タスク(未着手)')
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: 'Keep this title' } })
    fireEvent.change(screen.getByLabelText('説明'), { target: { value: 'Retry this task' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect((await screen.findByRole('alert')).textContent).toContain('タスクを保存できませんでした')
    expect((screen.getByLabelText('タイトル') as HTMLInputElement).value).toBe('Keep this title')
    expect((screen.getByLabelText('説明') as HTMLTextAreaElement).value).toBe('Retry this task')

    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(requestCount).toBe(2)
  })

  it('clears a create error when closing and reopening the form', async () => {
    let requestCount = 0
    server.use(
      http.post('*/api/tasks', async ({ request }) => {
        requestCount += 1
        const body = await request.json() as { title: string; description: string; status: Task['status'] }
        if (requestCount === 1) return new HttpResponse(null, { status: 500 })
        return HttpResponse.json({ ...body, id: 'task-retried', createdAt: '2026-01-03' }, { status: 201 })
      }),
    )
    renderBoard()

    fireEvent.click(screen.getByRole('button', { name: '未着手にタスクを追加' }))
    await screen.findByText('新規タスク(未着手)')
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: 'First attempt' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await screen.findByRole('alert')

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '未着手にタスクを追加' }))
    await screen.findByText('新規タスク(未着手)')
    expect(screen.queryByRole('alert')).toBeNull()
    expect((screen.getByLabelText('タイトル') as HTMLInputElement).value).toBe('')

    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: 'Retry attempt' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(requestCount).toBe(2)
  })

  it('keeps a reopened form open when an earlier save completes', async () => {
    let requestCount = 0
    let firstSaveStarted = false
    let firstSaveCompleted = false
    server.use(
      http.post('*/api/tasks', async ({ request }) => {
        requestCount += 1
        const body = await request.json() as { title: string; description: string; status: Task['status'] }
        if (requestCount === 1) {
          firstSaveStarted = true
          await delay(250)
          firstSaveCompleted = true
        }
        return HttpResponse.json({ ...body, id: `task-${requestCount}`, createdAt: '2026-01-03' }, { status: 201 })
      }),
    )
    renderBoard()

    fireEvent.click(screen.getByRole('button', { name: '未着手にタスクを追加' }))
    await screen.findByText('新規タスク(未着手)')
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: 'Earlier save' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(firstSaveStarted).toBe(true))

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '未着手にタスクを追加' }))
    await screen.findByText('新規タスク(未着手)')
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: 'New form' } })
    await waitFor(() => expect(firstSaveCompleted).toBe(true))

    expect(screen.getByRole('dialog')).toBeTruthy()
    expect((screen.getByLabelText('タイトル') as HTMLInputElement).value).toBe('New form')
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(requestCount).toBe(2)
  })
})
