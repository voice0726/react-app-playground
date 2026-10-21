import { useQuery } from '@tanstack/react-query'

import type { Deal } from '@/features/deals/types'
import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'
import { fetchJson } from '@/lib/apiClient'
import { buildListUrl, keepPreviousPage, type ListRequest, type PaginatedResponse } from '@/lib/pagination'

export const dealKeys = {
  all: ['deals'] as const,
  list: () => [...dealKeys.all, 'list'] as const,
  page: (request: ListRequest) => [...dealKeys.all, 'page', request] as const,
  detail: (id: string) => [...dealKeys.all, 'detail', id] as const,
}

export function useDeals() {
  return useQuery({
    queryKey: dealKeys.list(),
    queryFn: () => fetchJson<Deal[]>('/api/deals'),
  })
}

export function useDealPage(request: ListRequest) {
  return useQuery({
    queryKey: dealKeys.page(request),
    queryFn: () => fetchJson<PaginatedResponse<Deal>>(buildListUrl('/api/deals', request)),
    placeholderData: keepPreviousPage<Deal>(request),
  })
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: dealKeys.detail(id),
    queryFn: () => fetchJson<Deal>(`/api/deals/${id}`),
  })
}

export function useDealWithCustomer(id: string) {
  const dealQuery = useDeal(id)
  const customerId = dealQuery.data?.customerId
  const customerQuery = useQuery({
    queryKey: customerKeys.detail(customerId ?? ''),
    queryFn: () => fetchJson<Customer>(`/api/customers/${customerId}`),
    enabled: customerId !== undefined,
  })

  return { dealQuery, customerQuery }
}
