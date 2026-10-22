import { useOrganization } from '@/lib/organization'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTicketComment } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useUpdateTicketComment = () => {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof updateTicketComment>[0]) => updateTicketComment(input, organization.id),
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket, organization.id),
  })
}
