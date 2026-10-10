import { Badge } from '@mantine/core'
import { match } from 'ts-pattern'

import type { DealStatus } from '@/features/deals/types'

type DealStatusBadgeProps = {
  status: DealStatus
}

const statusLabels: Record<DealStatus, string> = { open: '商談中', won: '受注', lost: '失注' }

function statusColor(status: DealStatus): string {
  return match(status)
    .with('open', () => 'blue')
    .with('won', () => 'green')
    .with('lost', () => 'gray')
    .exhaustive()
}

export function DealStatusBadge({ status }: DealStatusBadgeProps) {
  return <Badge color={statusColor(status)}>{statusLabels[status]}</Badge>
}
