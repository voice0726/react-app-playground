import type { QueryClient } from '@tanstack/react-query'
import type { Ticket, TicketDetail } from '@/features/tickets/schemas/index'
import type { TicketsSearch } from '@/features/tickets/schemas/search'

export const TICKETS_STALE_TIME = 30_000
export const TICKETS_GC_TIME = 5 * 60_000

export const ticketsQueryKey = {
  all: ['tickets'] as const,
  lists: () => [...ticketsQueryKey.all, 'list'] as const,
  list: (filter: TicketsSearch) => [...ticketsQueryKey.all, 'list', filter] as const,
  details: () => [...ticketsQueryKey.all, 'detail'] as const,
  detail: (id: Ticket['id']) => [...ticketsQueryKey.all, 'detail', id] as const,
}

export const updateTicketDetailCache = async (queryClient: QueryClient, ticket: TicketDetail) => {
  queryClient.setQueryData(ticketsQueryKey.detail(ticket.id), ticket)
  await queryClient.invalidateQueries({ queryKey: ticketsQueryKey.lists() })
}
