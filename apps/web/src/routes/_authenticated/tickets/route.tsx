import { createFileRoute, Outlet, stripSearchParams, useRouterState } from '@tanstack/react-router'

import { IndexRoute } from '@/features/tickets/routes/IndexRoute'
import { TICKETS_SEARCH_DEFAULT, ticketsSearchSchema } from '@/features/tickets/schemas/search'

export const Route = createFileRoute('/_authenticated/tickets')({
  validateSearch: ticketsSearchSchema.parse,
  search: {
    middlewares: [stripSearchParams(TICKETS_SEARCH_DEFAULT)],
  },
  component: TicketsRoute,
})

function TicketsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  if (pathname.replace(/\/$/, '') !== '/tickets') {
    return <Outlet />
  }

  return <IndexRoute />
}
