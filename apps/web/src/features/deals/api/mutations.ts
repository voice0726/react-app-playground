import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { DealFormValues } from '@/features/deals/schemas/deal.schema'
import type { Deal } from '@/features/deals/types'

import { dealKeys } from './queries'
import { requestJson } from '@/lib/apiClient'

type UpdateDealInput = {
  id: string
  values: DealFormValues
}

export function useCreateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: DealFormValues) =>
      requestJson<Deal>('/api/deals', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dealKeys.all })
    },
  })
}

export function useUpdateDeal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateDealInput) =>
      requestJson<Deal>(`/api/deals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dealKeys.all }),
        queryClient.invalidateQueries({ queryKey: dealKeys.detail(variables.id) }),
      ])
    },
  })
}
