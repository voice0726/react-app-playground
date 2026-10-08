import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { fetchTickets } from '@/features/tickets/api/tickets'
import {
  TICKETS_GC_TIME,
  TICKETS_STALE_TIME,
  ticketsQueryKey,
} from '@/features/tickets/queryKeys'
import type { TicketsResponse } from '@/features/tickets/schemas/index'
import type { TicketsSearch } from '@/features/tickets/schemas/search'

export type UseTicketsOptions = {
  filters: TicketsSearch
}

export const useTickets = (opts: UseTicketsOptions) => {
  const { filters } = opts

  return useQuery<TicketsResponse>({
    queryKey: ticketsQueryKey.list(filters),
    queryFn: () => fetchTickets(filters),
    placeholderData: keepPreviousData,
    staleTime: TICKETS_STALE_TIME,
    gcTime: TICKETS_GC_TIME,
  })
}
