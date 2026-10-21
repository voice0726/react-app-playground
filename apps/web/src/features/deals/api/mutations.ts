import { useOrganization } from '@/lib/organization'
import { dashboardKeys } from '@/types/queryKeys'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { DealFormValues } from '@/features/deals/schemas/deal.schema'
import type { Deal } from '@/features/deals/types'

import { dealKeys } from './queries'
import { fetchOrganizationJson } from '@/lib/apiClient'

type UpdateDealInput = {
  id: string
  values: DealFormValues
}

export function useCreateDeal() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: DealFormValues) =>
      fetchOrganizationJson<Deal>(organization.id, '/api/deals', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: dealKeys.all })
    },
  })
}

export function useUpdateDeal() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateDealInput) =>
      fetchOrganizationJson<Deal>(organization.id, `/api/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dealKeys.all }),
        queryClient.invalidateQueries({ queryKey: dealKeys.detail(variables.id, organization.id) }),
      ])
    },
  })
}
