import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { CustomerFormValues } from '@/features/customers/schemas/customer.schema'
import type { Customer } from '@/types/customer.types'

import { customerKeys } from './queries'

type UpdateCustomerInput = {
  id: string
  values: CustomerFormValues
}

async function requestJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${url}`)
  }

  return (await response.json()) as T
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: CustomerFormValues) =>
      requestJson<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateCustomerInput) =>
      requestJson<Customer>(`/api/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.all }),
        queryClient.invalidateQueries({ queryKey: customerKeys.detail(variables.id) }),
      ])
    },
  })
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      requestJson<{ success: boolean }>(`/api/customers/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: customerKeys.all })
    },
  })
}
