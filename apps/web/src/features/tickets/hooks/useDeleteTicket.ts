import { useOrganization } from '@/lib/organization'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteTicket } from '@/features/tickets/api/tickets'
import { ticketsQueryKey } from '@/features/tickets/queryKeys'

export const useDeleteTicket = () => {
  const { organization } = useOrganization()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: Parameters<typeof deleteTicket>[0]) => deleteTicket(input, organization.id),
    onSuccess: async (_result, id) => {
      queryClient.removeQueries({ queryKey: ticketsQueryKey.detail(id, organization.id) })
      await queryClient.invalidateQueries({ queryKey: ticketsQueryKey.lists(organization.id) })
    },
  })
}
