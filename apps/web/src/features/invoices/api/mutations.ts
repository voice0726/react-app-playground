import { useOrganization } from '@/lib/organization'
import { dashboardKeys } from '@/types/queryKeys'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import type { InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'
import type { Invoice, InvoiceStatus } from '@/features/invoices/types'

import { invoiceKeys } from './queries'
import { fetchOrganizationJson } from '@/lib/apiClient'

type UpdateInvoiceInput = {
  id: string
  values: InvoiceFormValues
}

type AdvanceInvoiceStatusInput = {
  id: string
  nextStatus: InvoiceStatus
}

export type BulkInvoiceStatusInput = {
  ids: string[]
  from: 'draft' | 'sent'
  to: 'sent' | 'paid'
}

export function useCreateInvoice() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: InvoiceFormValues) =>
      fetchOrganizationJson<Invoice>(organization.id, '/api/invoices', {
        method: 'POST',
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    },
  })
}

export function useUpdateInvoice() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, values }: UpdateInvoiceInput) =>
      fetchOrganizationJson<Invoice>(organization.id, `/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id, organization.id) }),
      ])
    },
  })
}

export function useAdvanceInvoiceStatus() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, nextStatus }: AdvanceInvoiceStatusInput) =>
      fetchOrganizationJson<Invoice>(organization.id, `/api/invoices/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.detail(variables.id, organization.id) }),
      ])
    },
  })
}

export function useBulkInvoiceStatus() {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: BulkInvoiceStatusInput) =>
      fetchOrganizationJson<{ items: Invoice[] }>(organization.id, '/api/invoices/bulk-status', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: invoiceKeys.all }),
      ])
    },
  })
}
