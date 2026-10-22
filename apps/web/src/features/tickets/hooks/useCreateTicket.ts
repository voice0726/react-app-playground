import { useOrganization } from '@/lib/organization'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTicket } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useCreateTicket = () => {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof createTicket>[0]) => createTicket(input, organization.id),
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket, organization.id),
  })
}
