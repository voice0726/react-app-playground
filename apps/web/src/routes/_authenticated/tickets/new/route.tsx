import { createFileRoute } from '@tanstack/react-router'

import { CreateRoute } from '@/features/tickets/routes/CreateRoute'

export const Route = createFileRoute('/_authenticated/tickets/new')({
  component: TicketCreateRoute,
})

function TicketCreateRoute() {
  const search = Route.useSearch()

  return <CreateRoute search={search} />
}
