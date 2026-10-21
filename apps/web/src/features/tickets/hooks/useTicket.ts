import { useOrganization } from '@/lib/organization'
import { useQuery } from '@tanstack/react-query'
import { fetchTicket } from '@/features/tickets/api/tickets'
import {
  TICKETS_GC_TIME,
  TICKETS_STALE_TIME,
  ticketsQueryKey,
} from '@/features/tickets/queryKeys'
import type { Ticket } from '@/features/tickets/schemas/index'

export type UseTicketOptions = {
  id: Ticket['id']
}

export const useTicket = ({ id }: UseTicketOptions) => {
  const { organization } = useOrganization()
  return useQuery({
    queryKey: ticketsQueryKey.detail(id, organization.id),
    queryFn: ({ signal }) => fetchTicket(id, organization.id, signal),
    staleTime: TICKETS_STALE_TIME,
    gcTime: TICKETS_GC_TIME,
  })
}
