import { useOrganization } from '@/lib/organization'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createTicketComment } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useCreateTicketComment = () => {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof createTicketComment>[0]) => createTicketComment(input, organization.id),
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket, organization.id),
  })
}
