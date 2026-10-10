import { match } from 'ts-pattern'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled'

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: '下書き',
  sent: '送付済み',
  paid: '支払済み',
  cancelled: 'キャンセル',
}

export type Invoice = {
  id: string
  number: string
  customerId: string
  amount: number
  issueDate: string
  dueDate: string
  status: InvoiceStatus
}

export function getNextStatus(status: InvoiceStatus): InvoiceStatus | null {
  return match(status)
    .with('draft', () => 'sent' as const)
    .with('sent', () => 'paid' as const)
    .with('paid', () => null)
    .with('cancelled', () => null)
    .exhaustive()
}
