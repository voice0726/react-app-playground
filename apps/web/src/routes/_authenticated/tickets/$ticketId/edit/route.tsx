import { createFileRoute } from '@tanstack/react-router'

import { TicketRequestError } from '@/features/tickets/components/feedback/TicketRequestError'
import { TicketPageLayout } from '@/features/tickets/components/layout/TicketPageLayout'
import { TicketsBackButton } from '@/features/tickets/components/layout/TicketsBackButton'
import { EditRoute } from '@/features/tickets/routes/EditRoute'
import { parseTicketId } from '@/features/tickets/routes/helpers'

export const Route = createFileRoute('/_authenticated/tickets/$ticketId/edit')({
  remountDeps: ({ params }) => params.ticketId,
  component: TicketEditRoute,
})

function TicketEditRoute() {
  const { ticketId: ticketIdParam } = Route.useParams()
  const search = Route.useSearch()
  const ticketId = parseTicketId(ticketIdParam)

  if (ticketId === null) {
    return (
      <TicketPageLayout
        title="チケットを編集できません"
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

  return <EditRoute search={search} ticketId={ticketId} />
}
