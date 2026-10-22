import { useOrganization } from '@/lib/organization'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { Deal } from '@/features/deals/types'
import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'
import { fetchOrganizationJson } from '@/lib/apiClient'
import { buildListUrl, type ListRequest, type PaginatedResponse } from '@/lib/pagination'

export const dealKeys = {
  all: ['deals'] as const,
  list: (organizationId: string) => [...dealKeys.all, 'list', organizationId] as const,
  page: (request: ListRequest, organizationId: string) => [...dealKeys.all, 'page', organizationId, request] as const,
  detail: (id: string, organizationId: string) => [...dealKeys.all, 'detail', organizationId, id] as const,
}

export function useDealPage(request: ListRequest) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: dealKeys.page(request, organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<PaginatedResponse<Deal>>(organization.id, buildListUrl('/api/deals', request), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useDeal(id: string) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: dealKeys.detail(id, organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<Deal>(organization.id, `/api/deals/${id}`, { signal }),
  })
}

export function useDealWithCustomer(id: string) {
  const { organization } = useOrganization()
  const dealQuery = useDeal(id)
  const customerId = dealQuery.data?.customerId
  const customerQuery = useQuery({
    queryKey: customerKeys.detail(customerId ?? '', organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<Customer>(organization.id, `/api/customers/${customerId}`, { signal }),
    enabled: customerId !== undefined,
  })

  return { dealQuery, customerQuery }
}
