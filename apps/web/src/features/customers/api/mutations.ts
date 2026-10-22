import { useOrganization } from '@/lib/organization'
import { dashboardKeys } from '@/types/queryKeys'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { CustomerFormValues } from '@/features/customers/schemas/customer.schema'
import type { Customer } from '@/types/customer.types'

import { customerKeys } from './queries'
import { fetchOrganizationJson } from '@/lib/apiClient'

type UpdateCustomerInput = {
  id: string
  values: CustomerFormValues
}

export function useCreateCustomer() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: CustomerFormValues) =>
      fetchOrganizationJson<Customer>(organization.id, '/api/customers', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useUpdateCustomer() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateCustomerInput) =>
      fetchOrganizationJson<Customer>(organization.id, `/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.all }),
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id, organization.id) }),
      ])
    },
  })
}

export function useDeleteCustomer() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      fetchOrganizationJson<{ success: boolean }>(organization.id, `/api/customers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}
