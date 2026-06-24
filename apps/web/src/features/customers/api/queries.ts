import { useQuery } from '@tanstack/react-query'

import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'

export { customerKeys }

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return (await response.json()) as T
}

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
