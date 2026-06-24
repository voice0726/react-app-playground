import { Badge } from '@mantine/core'
import React from 'react'

import type { CustomerStatus } from '@/types/customer.types'

type CustomerStatusBadgeProps = {
  status: CustomerStatus
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  return (
    <Badge color={status === 'active' ? 'green' : 'gray'} variant="light">
      {status}
    </Badge>
  )
}
