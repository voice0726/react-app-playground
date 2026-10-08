import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTicket } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useCreateTicket = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createTicket,
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket),
  })
}
