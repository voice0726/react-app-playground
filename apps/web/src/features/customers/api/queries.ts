import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'
import { fetchJson } from '@/lib/apiClient'
import { buildListUrl, type ListRequest, type PaginatedResponse } from '@/lib/pagination'

export { customerKeys }

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: () => fetchJson<Customer[]>('/api/customers'),
  })
}

export function useCustomerPage(request: ListRequest) {
  return useQuery({
    queryKey: customerKeys.page(request),
    queryFn: () => fetchJson<PaginatedResponse<Customer>>(buildListUrl('/api/customers', request)),
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => fetchJson<Customer>(`/api/customers/${id}`),
  })
}
