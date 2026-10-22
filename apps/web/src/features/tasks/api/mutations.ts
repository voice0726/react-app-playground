import { useOrganization } from '@/lib/organization'
import { dashboardKeys } from '@/types/queryKeys'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { TaskFormValues } from '@/features/tasks/schemas/task.schema'
import type { Task, TaskStatus } from '@/features/tasks/types'

import { taskKeys } from './queries'
import { fetchOrganizationJson } from '@/lib/apiClient'

type UpdateTaskInput = {
  id: string
  values: TaskFormValues
}

type UpdateTaskStatusInput = {
  id: string
  status: TaskStatus
}

export function useCreateTask() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: TaskFormValues) =>
      fetchOrganizationJson<Task>(organization.id, '/api/tasks', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUpdateTask() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateTaskInput) =>
      fetchOrganizationJson<Task>(organization.id, `/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}

export function useUpdateTaskStatus() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: UpdateTaskStatusInput) =>
      fetchOrganizationJson<Task>(organization.id, `/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: taskKeys.all })
    },
  })
}
