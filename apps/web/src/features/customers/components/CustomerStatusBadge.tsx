import { Badge } from '@mantine/core'

import type { CustomerStatus } from '@/types/customer.types'

type CustomerStatusBadgeProps = {
  status: CustomerStatus
}

export function CustomerStatusBadge({ status }: CustomerStatusBadgeProps) {
  return (
    <Badge color={status === 'active' ? 'green' : 'gray'} variant="light">
      {status === 'active' ? '有効' : '無効'}
    </Badge>
  )
}
