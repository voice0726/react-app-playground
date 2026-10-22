import { useOrganization } from '@/lib/organization'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTicket } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useUpdateTicket = () => {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateTicket>[0]) => updateTicket(input, organization.id),
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket, organization.id),
  })
}
