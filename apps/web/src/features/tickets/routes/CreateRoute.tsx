import { useNavigate } from '@tanstack/react-router'
import { TicketForm } from '@/features/tickets/components/forms/TicketForm'
import { TicketPageLayout } from '@/features/tickets/components/layout/TicketPageLayout'
import { TicketsBackButton } from '@/features/tickets/components/layout/TicketsBackButton'
import { useCreateTicket } from '@/features/tickets/hooks/useCreateTicket'
import { TICKET_FORM_DEFAULT_VALUES } from '@/features/tickets/schemas/form'
import type { TicketsSearch } from '@/features/tickets/schemas/search'
import { getErrorMessage } from '@/features/tickets/utils/getErrorMessage'
import { showToast } from '@/lib/toast'

export function CreateRoute({ search }: { search: TicketsSearch }) {
  const navigate = useNavigate()
  const createTicket = useCreateTicket()

  return (
    <TicketPageLayout
      title="新規チケット"
      description="フォームを送信すると作成したチケットの詳細ページへ遷移します。"
      actions={<TicketsBackButton search={search} />}
    >
      <TicketForm
        cancelButton={<TicketsBackButton search={search} />}
        errorMessage={
          createTicket.isError
            ? getErrorMessage(createTicket.error, 'チケットの作成に失敗しました')
            : undefined
        }
        initialValues={TICKET_FORM_DEFAULT_VALUES}
        isSubmitting={createTicket.isPending}
        submitLabel="作成する"
        onSubmit={(values) => {
          createTicket.mutate(values, {
            onError: (error) => {
              showToast({
                title: '作成に失敗しました',
                message: getErrorMessage(error, '入力内容を確認して再試行してください'),
                color: 'red',
              })
            },
            onSuccess: (ticket) => {
              showToast({
                title: 'チケットを作成しました',
                message: `#${ticket.id} ${ticket.title}`,
              })

              void navigate({
                to: '/tickets/$ticketId',
                params: { ticketId: String(ticket.id) },
                search,
              })
            },
          })
        }}
      />
    </TicketPageLayout>
  )
}
