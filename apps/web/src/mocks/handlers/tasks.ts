import { organizationData } from './organizationData'
import { http, HttpResponse } from 'msw'

import { tasks as seedTasks, type Task, type TaskStatus } from '../data/seed'
import { createId, notFound, readJsonObject, stringValue } from './utils'

const store = organizationData<Task>(seedTasks)
export const taskSnapshot = store.snapshot

export function resetTaskState(): void {
  store.reset()
}

function findTask(id: string, request: Request): Task | undefined {
  return store.get(request).find((task) => task.id === id)
}

function taskStatus(value: unknown, fallback: TaskStatus): TaskStatus {
  const status = stringValue(value)

  if (status === 'TODO' || status === 'IN_PROGRESS' || status === 'DONE') {
    return status
  }

  return fallback
}

export const taskHandlers = [
  http.get('*/api/tasks', ({ request }) => HttpResponse.json(store.get(request))),
  http.post('*/api/tasks', async ({ request }) => {
    const tasks = store.get(request)
    const body = await readJsonObject(request)
    const task: Task = {
      id: createId('task', tasks.length),
      title: stringValue(body.title) ?? 'New task',
      description: stringValue(body.description) ?? '',
      status: taskStatus(body.status, 'TODO'),
      createdAt: new Date().toISOString(),
    }

    store.set(request, [...tasks, task])

    return HttpResponse.json(task, { status: 201 })
  }),
  http.patch('*/api/tasks/:id', async ({ params, request }) => {
    const tasks = store.get(request)
    const id = stringValue(params.id)
    const task = id === undefined ? undefined : findTask(id, request)

    if (id === undefined || task === undefined) {
      return notFound('Task')
    }

    const body = await readJsonObject(request)
    const updated: Task = {
      ...task,
      title: stringValue(body.title) ?? task.title,
      description: stringValue(body.description) ?? task.description,
      status: taskStatus(body.status, task.status),
    }

    store.set(request, tasks.map((item) => (item.id === id ? updated : item)))

    return HttpResponse.json(updated)
  }),
  http.delete('*/api/tasks/:id', ({ params, request }) => {
    const tasks = store.get(request)
    const id = stringValue(params.id)
    const task = id === undefined ? undefined : findTask(id, request)

    if (id === undefined || task === undefined) {
      return notFound('Task')
    }

    store.set(request, tasks.filter((item) => item.id !== id))

    return HttpResponse.json({ success: true })
  }),
]
