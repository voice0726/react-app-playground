import type { QueryClient } from '@tanstack/react-query'
import type { Ticket, TicketDetail } from '@/features/tickets/schemas/index'
import type { TicketsSearch } from '@/features/tickets/schemas/search'

export const TICKETS_STALE_TIME = 30_000
export const TICKETS_GC_TIME = 5 * 60_000

export const ticketsQueryKey = {
  all: ['tickets'] as const,
  lists: (organizationId: string) => [...ticketsQueryKey.all, 'list', organizationId] as const,
  list: (filter: TicketsSearch, organizationId: string) => [...ticketsQueryKey.all, 'list', organizationId, filter] as const,
  details: (organizationId: string) => [...ticketsQueryKey.all, 'detail', organizationId] as const,
  detail: (id: Ticket['id'], organizationId: string) => [...ticketsQueryKey.all, 'detail', organizationId, id] as const,
}

export const updateTicketDetailCache = async (queryClient: QueryClient, ticket: TicketDetail, organizationId: string) => {
  queryClient.setQueryData(ticketsQueryKey.detail(ticket.id, organizationId), ticket)
  await queryClient.invalidateQueries({ queryKey: ticketsQueryKey.lists(organizationId) })
}
