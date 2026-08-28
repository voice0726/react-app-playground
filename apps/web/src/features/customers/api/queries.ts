import { useQuery } from '@tanstack/react-query'

import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'
import { fetchJson } from '@/lib/apiClient'

export { customerKeys }

export function useCustomers() {
  return useQuery({
    queryKey: customerKeys.list(),
    queryFn: () => fetchJson<Customer[]>('/api/customers'),
  })
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => fetchJson<Customer>(`/api/customers/${id}`),
  })
}
