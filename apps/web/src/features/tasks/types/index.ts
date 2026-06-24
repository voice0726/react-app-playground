export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE'

export type Task = {
  id: string
  title: string
  description: string
  status: TaskStatus
  createdAt: string
}

export const taskStatuses = ['TODO', 'IN_PROGRESS', 'DONE'] as const satisfies readonly TaskStatus[]

export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatuses.some((status) => status === value)
}
