import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'

import { TicketRequestError } from '@/features/tickets/components/feedback/TicketRequestError'
import { TicketPageLayout } from '@/features/tickets/components/layout/TicketPageLayout'
import { TicketsBackButton } from '@/features/tickets/components/layout/TicketsBackButton'
import { DetailRoute } from '@/features/tickets/routes/DetailRoute'
import { parseTicketId } from '@/features/tickets/routes/helpers'

export const Route = createFileRoute('/_authenticated/tickets/$ticketId')({
  remountDeps: ({ params }) => params.ticketId,
  component: TicketDetailRoute,
})

function TicketDetailRoute() {
  const { ticketId: ticketIdParam } = Route.useParams()
  const search = Route.useSearch()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const ticketId = parseTicketId(ticketIdParam)

  if (pathname.replace(/\/$/, '') !== `/tickets/${ticketIdParam}`) {
    return <Outlet />
  }

  if (ticketId === null) {
    return (
      <TicketPageLayout
        title="チケットを表示できません"
        description="URL に含まれるチケットIDが不正です。"
      >
        <TicketRequestError
          message="有効なチケットIDを指定して再度アクセスしてください。"
          secondaryAction={<TicketsBackButton search={search} />}
          title="不正なチケットIDです"
        />
      </TicketPageLayout>
    )
  }

  return <DetailRoute search={search} ticketId={ticketId} />
}
