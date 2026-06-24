import { Badge } from '@mantine/core'
import React from 'react'
import { match } from 'ts-pattern'

import type { DealStatus } from '@/features/deals/types'

type DealStatusBadgeProps = {
  status: DealStatus
}

function statusColor(status: DealStatus): string {
  return match(status)
    .with('open', () => 'blue')
    .with('won', () => 'green')
    .with('lost', () => 'gray')
    .exhaustive()
}

export function DealStatusBadge({ status }: DealStatusBadgeProps) {
  return <Badge color={statusColor(status)}>{status}</Badge>
}
