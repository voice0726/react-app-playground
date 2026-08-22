import { http, HttpResponse } from 'msw'

import { tasks as seedTasks, type Task, type TaskStatus } from '../data/seed'
import { createId, notFound, readJsonObject, stringValue } from './utils'

let tasks: Task[] = [...seedTasks]

export function resetTaskState(): void {
  tasks = [...seedTasks]
}

function findTask(id: string): Task | undefined {
  return tasks.find((task) => task.id === id)
}

function taskStatus(value: unknown, fallback: TaskStatus): TaskStatus {
  const status = stringValue(value)

  if (status === 'TODO' || status === 'IN_PROGRESS' || status === 'DONE') {
    return status
  }

  return fallback
}

export const taskHandlers = [
  http.get('*/api/tasks', () => HttpResponse.json(tasks)),
  http.post('*/api/tasks', async ({ request }) => {
    const body = await readJsonObject(request)
    const task: Task = {
      id: createId('task', tasks.length),
      title: stringValue(body.title) ?? 'New task',
      description: stringValue(body.description) ?? '',
      status: taskStatus(body.status, 'TODO'),
      createdAt: new Date().toISOString(),
    }

    tasks = [...tasks, task]

    return HttpResponse.json(task, { status: 201 })
  }),
  http.patch('*/api/tasks/:id', async ({ params, request }) => {
    const id = stringValue(params.id)
    const task = id === undefined ? undefined : findTask(id)

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

    tasks = tasks.map((item) => (item.id === id ? updated : item))

    return HttpResponse.json(updated)
  }),
  http.delete('*/api/tasks/:id', ({ params }) => {
    const id = stringValue(params.id)
    const task = id === undefined ? undefined : findTask(id)

    if (id === undefined || task === undefined) {
      return notFound('Task')
    }

    tasks = tasks.filter((item) => item.id !== id)

    return HttpResponse.json({ success: true })
  }),
]
