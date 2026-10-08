import { Badge } from '@mantine/core'
import type { Ticket } from '@/features/tickets/schemas/index'

const STATUS_LABEL: Record<Ticket['status'], string> = {
  open: 'Open',
  closed: 'Closed',
}

export function TicketStatusBadge({ status }: { status: Ticket['status'] }) {
  return (
    <Badge color={status === 'open' ? 'teal' : 'gray'} variant="light">
      {STATUS_LABEL[status]}
    </Badge>
  )
}
