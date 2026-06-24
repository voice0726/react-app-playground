import { beforeEach, describe, expect, it } from 'vitest'

import type { Task } from '@/features/tasks/types'

import { useKanbanStore } from './kanban.store'

const taskA: Task = {
  id: 'task-a',
  title: 'Task A',
  description: '',
  status: 'TODO',
  createdAt: '2026-01-01T00:00:00.000Z',
}
const taskB: Task = {
  id: 'task-b',
  title: 'Task B',
  description: '',
  status: 'DONE',
  createdAt: '2026-01-01T00:00:00.000Z',
}
const tasks: Task[] = [taskA, taskB]

describe('kanban store', () => {
  beforeEach(() => {
    useKanbanStore.setState({
      tasks: [],
      activeTaskId: null,
    })
  })

  it('tracks the active task id', () => {
    useKanbanStore.getState().setActiveTaskId('task-a')

    expect(useKanbanStore.getState().activeTaskId).toBe('task-a')
  })

  it('moves a task with an optimistic status update', () => {
    useKanbanStore.getState().setTasks(tasks)
    useKanbanStore.getState().moveTask('task-a', 'IN_PROGRESS')

    expect(useKanbanStore.getState().tasks).toEqual([
      {
        ...taskA,
        status: 'IN_PROGRESS',
      },
      taskB,
    ])
  })
})
