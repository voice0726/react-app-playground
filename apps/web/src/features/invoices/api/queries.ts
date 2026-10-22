import type { InvoiceSummary } from '@/types/dashboard.types'
import { useOrganization } from '@/lib/organization'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { Invoice } from '@/features/invoices/types'
import { fetchOrganizationJson } from '@/lib/apiClient'
import { buildListUrl, type ListRequest, type PaginatedResponse } from '@/lib/pagination'

export const invoiceKeys = {
  all: ['invoices'] as const,
  list: (organizationId: string) => [...invoiceKeys.all, 'list', organizationId] as const,
  page: (request: ListRequest, organizationId: string) => [...invoiceKeys.all, 'page', organizationId, request] as const,
  summary: (organizationId: string, today: string) => [...invoiceKeys.all, 'summary', organizationId, today] as const,
  detail: (id: string, organizationId: string) => [...invoiceKeys.all, 'detail', organizationId, id] as const,
}

export function useInvoicePage(request: ListRequest) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: invoiceKeys.page(request, organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<PaginatedResponse<Invoice>>(organization.id, buildListUrl('/api/invoices', request), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useInvoice(id: string) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: invoiceKeys.detail(id, organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<Invoice>(organization.id, `/api/invoices/${id}`, { signal }),
  })
}

export function useInvoiceSummary(today: string) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: invoiceKeys.summary(organization.id, today),
    queryFn: ({ signal }) => fetchOrganizationJson<InvoiceSummary>(
      organization.id, `/api/invoices/summary?today=${encodeURIComponent(today)}`, { signal },
    ),
  })
}
