import type { ListRequest } from '@/lib/pagination'

export const customerKeys = {
  all: ['customers'] as const,
  list: () => [...customerKeys.all, 'list'] as const,
  page: (request: ListRequest) => [...customerKeys.all, 'page', request] as const,
  detail: (id: string) => [...customerKeys.all, 'detail', id] as const,
}
