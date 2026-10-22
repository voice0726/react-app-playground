import type { ListRequest } from '@/lib/pagination'

export const customerKeys = {
  all: ['customers'] as const,
  list: (organizationId: string) => [...customerKeys.all, 'list', organizationId] as const,
  page: (request: ListRequest, organizationId: string) => [...customerKeys.all, 'page', organizationId, request] as const,
  detail: (id: string, organizationId: string) => [...customerKeys.all, 'detail', organizationId, id] as const,
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  detail: (organizationId: string, today: string) => ['dashboard', organizationId, today] as const,
}
