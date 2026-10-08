import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTicket } from '@/features/tickets/api/tickets'
import { ticketsQueryKey } from '@/features/tickets/queryKeys'

export const useDeleteTicket = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTicket,
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: ticketsQueryKey.detail(id) })
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey.lists() })
    },
  })
}
