import { useQuery } from '@tanstack/react-query'

import type { Invoice } from '@/features/invoices/types'
import { fetchJson } from '@/lib/apiClient'
import { buildListUrl, keepPreviousPage, type ListRequest, type PaginatedResponse } from '@/lib/pagination'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: () => [...invoiceKeys.all, 'list'] as const,
  page: (request: ListRequest) => [...invoiceKeys.all, 'page', request] as const,
  detail: (id: string) => [...invoiceKeys.all, 'detail', id] as const,
}

export function useInvoices() {
  return useQuery({
    queryKey: invoiceKeys.list(),
    queryFn: () => fetchJson<Invoice[]>('/api/invoices'),
  })
}

export function useInvoicePage(request: ListRequest) {
  return useQuery({
    queryKey: invoiceKeys.page(request),
    queryFn: () => fetchJson<PaginatedResponse<Invoice>>(buildListUrl('/api/invoices', request)),
    placeholderData: keepPreviousPage<Invoice>(request),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: () => fetchJson<Invoice>(`/api/invoices/${id}`),
  })
}
