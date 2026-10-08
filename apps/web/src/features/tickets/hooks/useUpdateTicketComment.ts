import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTicketComment } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useUpdateTicketComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateTicketComment,
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket),
  })
}
