import { useQuery } from '@tanstack/react-query'

import type { Task } from '@/features/tasks/types'

export const taskKeys = {
  all: ['tasks'] as const,
  list: () => [...taskKeys.all, 'list'] as const,
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return (await response.json()) as T
}

export function useTasks() {
  return useQuery({
    queryKey: taskKeys.list(),
    queryFn: () => fetchJson<Task[]>('/api/tasks'),
  })
}
