import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TaskFormValues } from '@/features/tasks/schemas/task.schema'
import type { Task, TaskStatus } from '@/features/tasks/types'

import { taskKeys } from './queries'

type UpdateTaskInput = {
  id: string
  values: TaskFormValues
}

type UpdateTaskStatusInput = {
  id: string
  status: TaskStatus
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${url}`)
  }

  return (await response.json()) as T
}

export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: TaskFormValues) =>
      requestJson<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateTaskInput) =>
      requestJson<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: UpdateTaskStatusInput) =>
      requestJson<Task>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
