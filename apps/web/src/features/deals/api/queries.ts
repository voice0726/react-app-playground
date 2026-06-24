import { useQuery } from '@tanstack/react-query'

import type { Deal } from '@/features/deals/types'
import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'

export const dealKeys = {
  all: ['deals'] as const,
  list: () => [...dealKeys.all, 'list'] as const,
  detail: (id: string) => [...dealKeys.all, 'detail', id] as const,
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return (await response.json()) as T
}

export function useDeals() {
  return useQuery({
    queryKey: dealKeys.list(),
    queryFn: () => fetchJson<Deal[]>('/api/deals'),
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
