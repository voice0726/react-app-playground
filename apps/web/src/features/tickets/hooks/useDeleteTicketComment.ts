import { useOrganization } from '@/lib/organization'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTicketComment } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useDeleteTicketComment = () => {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof deleteTicketComment>[0]) => deleteTicketComment(input, organization.id),
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket, organization.id),
  })
}
