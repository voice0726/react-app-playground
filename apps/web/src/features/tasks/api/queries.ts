import { useQuery } from '@tanstack/react-query'

import type { Task } from '@/features/tasks/types'
import { fetchJson } from '@/lib/apiClient'

export const taskKeys = {
  all: ['tasks'] as const,
  list: () => [...taskKeys.all, 'list'] as const,
}

export function useTasks() {
  return useQuery({
    queryKey: taskKeys.list(),
    queryFn: () => fetchJson<Task[]>('/api/tasks'),
  })
}
