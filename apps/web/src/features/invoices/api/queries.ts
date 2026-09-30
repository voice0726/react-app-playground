import { useQuery } from '@tanstack/react-query'

import type { Invoice } from '@/features/invoices/types'
import { fetchJson } from '@/lib/apiClient'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
}

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn: () => fetchJson<Invoice[]>('/api/invoices'),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => fetchJson<Invoice>(`/api/invoices/${id}`),
  })
}
