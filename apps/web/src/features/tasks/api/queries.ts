import { useOrganization } from '@/lib/organization'
import { useQuery } from '@tanstack/react-query'

import type { Task } from '@/features/tasks/types'
import { fetchOrganizationJson } from '@/lib/apiClient'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (organizationId: string) => [...taskKeys.all, 'list', organizationId] as const,
}

export function useTasks() {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: taskKeys.list(organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<Task[]>(organization.id, '/api/tasks', { signal }),
  })
}
