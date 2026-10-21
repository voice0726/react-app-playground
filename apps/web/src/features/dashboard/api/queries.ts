import { useQuery } from '@tanstack/react-query'

import { fetchOrganizationJson } from '@/lib/apiClient'
import type { DashboardSummary } from '@/types/dashboard.types'

import { dashboardKeys } from '@/types/queryKeys'

export function useDashboard(organizationId: string, today: string, enabled = true) {
  return useQuery({
    queryKey: dashboardKeys.detail(organizationId, today),
    queryFn: ({ signal }) => fetchOrganizationJson<DashboardSummary>(
      organizationId,
      `/api/dashboard?today=${encodeURIComponent(today)}`,
      { signal },
    ),
    enabled: enabled && organizationId.length > 0,
  })
}
