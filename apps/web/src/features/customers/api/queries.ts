import { useOrganization } from '@/lib/organization'
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import type { Customer } from '@/types/customer.types'
import { customerKeys } from '@/types/queryKeys'
import { fetchOrganizationJson } from '@/lib/apiClient'
import { buildListUrl, type ListRequest, type PaginatedResponse } from '@/lib/pagination'

export { customerKeys }

export function useCustomerPage(request: ListRequest) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: customerKeys.page(request, organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<PaginatedResponse<Customer>>(organization.id, buildListUrl('/api/customers', request), { signal }),
    placeholderData: keepPreviousData,
  })
}

export function useCustomer(id: string) {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: customerKeys.detail(id, organization.id),
    queryFn: ({ signal }) => fetchOrganizationJson<Customer>(organization.id, `/api/customers/${id}`, { signal }),
  })
}
