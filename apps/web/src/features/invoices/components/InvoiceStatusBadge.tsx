import { Badge } from '@mantine/core'
import { match } from 'ts-pattern'

import type { InvoiceStatus } from '@/features/invoices/types'

type InvoiceStatusBadgeProps = {
  status: InvoiceStatus
}

function statusColor(status: InvoiceStatus): string {
  return match(status)
    .with('draft', () => 'gray')
    .with('sent', () => 'blue')
    .with('paid', () => 'green')
    .with('cancelled', () => 'red')
    .exhaustive()
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return <Badge color={statusColor(status)}>{status}</Badge>
}
