import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'
import type { Invoice, InvoiceStatus } from '@/features/invoices/types'

import { invoiceKeys } from './queries'
import { requestJson } from '@/lib/apiClient'

type UpdateInvoiceInput = {
  id: string
  values: InvoiceFormValues
}

type AdvanceInvoiceStatusInput = {
  id: string
  nextStatus: InvoiceStatus
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: InvoiceFormValues) =>
      requestJson<Invoice>('/api/invoices', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateInvoiceInput) =>
      requestJson<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) }),
      ])
    },
  })
}

export function useAdvanceInvoiceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, nextStatus }: AdvanceInvoiceStatusInput) =>
      requestJson<Invoice>(`/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id) }),
      ])
    },
  })
}
