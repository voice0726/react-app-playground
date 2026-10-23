import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { useBulkInvoiceStatus } from '@/features/invoices/api/mutations'
import type { BulkInvoiceStatusInput } from '@/features/invoices/api/mutations'
import { invoiceKeys } from '@/features/invoices/api/queries'
import type { Invoice } from '@/features/invoices/types'
import { ApiError } from '@/lib/apiClient'

type BulkResult = { kind: 'success' | 'error'; message: string }
type BulkConfirmation = BulkInvoiceStatusInput & { viewKey: string }
type BulkState = {
  viewKey: string
  ids: string[]
  result?: BulkResult
  confirmation: BulkConfirmation | null
}

const transitions = {
  draft: { from: 'draft', to: 'sent' },
  sent: { from: 'sent', to: 'paid' },
} as const

function selectedTransition(invoices: Invoice[]) {
  const status = invoices[0]?.status
  if (status !== 'draft' && status !== 'sent') return undefined
  if (!invoices.every((invoice) => invoice.status === status)) return undefined
  return transitions[status]
}

function objectProperty(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') return undefined
  return Reflect.get(value, key)
}

function invoiceIdsFromError(body: unknown): string[] {
  const details = objectProperty(objectProperty(body, 'error'), 'details')
  const ids = objectProperty(details, 'invoiceIds')
  if (!Array.isArray(ids)) return []
  return ids.filter((id): id is string => typeof id === 'string')
}

function errorMessage(error: unknown) {
  const fallback = '一括変更できませんでした。請求書の状態を確認して、もう一度お試しください。'
  if (!(error instanceof ApiError)) return fallback
  const messages: Partial<Record<number, string>> = {
    409: '状態が変更されている請求書があります。最新の一覧を確認してください。',
    404: '請求書が見つかりません。選択対象を確認してください。',
  }
  const message = messages[error.status] ?? fallback
  const ids = invoiceIdsFromError(error.body)
  return ids.length > 0 ? `${message} 対象の請求書 ID: ${ids.join(', ')}` : message
}

function selectionIsInvalid(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 409)
}

function confirmationIsCurrent(confirmation: BulkConfirmation, state: BulkState) {
  return confirmation.viewKey === state.viewKey &&
    confirmation.ids.length === state.ids.length &&
    confirmation.ids.every((id, index) => id === state.ids[index])
}

function emptyState(viewKey: string): BulkState {
  return { viewKey, ids: [], confirmation: null }
}

export function useInvoiceBulkActions(viewKey: string, invoices: Invoice[]) {
  const [state, setState] = useState(() => emptyState(viewKey))
  if (state.viewKey !== viewKey) setState(emptyState(viewKey))
  const current = state.viewKey === viewKey ? state : emptyState(viewKey)
  const selectedIds = useMemo(() => new Set(current.ids), [current.ids])
  const transition = selectedTransition(invoices.filter((invoice) => selectedIds.has(invoice.id)))
  const bulkStatus = useBulkInvoiceStatus()
  const queryClient = useQueryClient()

  const updateCurrent = (update: (previous: BulkState) => BulkState) => {
    setState((previous) => previous.viewKey === viewKey ? update(previous) : previous)
  }

  const setSelected = (id: string, checked: boolean) => {
    updateCurrent((previous) => ({
      ...previous,
      ids: checked ? [...previous.ids, id] : previous.ids.filter((selected) => selected !== id),
    }))
  }

  const closeConfirmation = () => {
    updateCurrent((previous) => ({ ...previous, confirmation: null }))
  }

  const openConfirmation = () => {
    if (!transition) return
    updateCurrent((previous) => ({
      ...previous,
      confirmation: { ...transition, viewKey, ids: [...previous.ids] },
    }))
  }

  const confirm = async () => {
    const pending = current.confirmation
    closeConfirmation()
    if (!pending || !confirmationIsCurrent(pending, current)) return
    updateCurrent((previous) => ({ ...previous, result: undefined }))
    try {
      const result = await bulkStatus.mutateAsync({ ids: pending.ids, from: pending.from, to: pending.to })
      updateCurrent((previous) => ({
        ...previous,
        ids: [],
        result: { kind: 'success', message: `${result.items.length} 件を${pending.to === 'sent' ? '送付済み' : '入金済み'}に変更しました。` },
      }))
    } catch (error) {
      const resetSelection = selectionIsInvalid(error)
      updateCurrent((previous) => ({
        ...previous,
        ids: resetSelection ? [] : previous.ids,
        result: { kind: 'error', message: errorMessage(error) },
      }))
      if (resetSelection) await queryClient.invalidateQueries({ queryKey: invoiceKeys.all })
    }
  }

  return {
    selectedIds,
    result: current.result,
    confirmation: current.confirmation,
    transition,
    isPending: bulkStatus.isPending,
    setSelected,
    openConfirmation,
    closeConfirmation,
    confirm,
  }
}
