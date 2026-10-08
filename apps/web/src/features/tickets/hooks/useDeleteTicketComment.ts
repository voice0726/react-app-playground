import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTicketComment } from '@/features/tickets/api/tickets'
import { updateTicketDetailCache } from '@/features/tickets/queryKeys'

export const useDeleteTicketComment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTicketComment,
    onSuccess: (ticket) => updateTicketDetailCache(queryClient, ticket),
  })
}
