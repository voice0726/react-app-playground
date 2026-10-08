import type { UseFormReset } from 'react-hook-form'
import { useCreateTicketComment } from '@/features/tickets/hooks/useCreateTicketComment'
import { useDeleteTicketComment } from '@/features/tickets/hooks/useDeleteTicketComment'
import { useUpdateTicketComment } from '@/features/tickets/hooks/useUpdateTicketComment'
import {
  TICKET_COMMENT_FORM_DEFAULT_VALUES,
  type TicketCommentFormOutput,
} from '@/features/tickets/schemas/form'
import type { TicketComment } from '@/features/tickets/schemas/index'
import { getErrorMessage } from '@/features/tickets/utils/getErrorMessage'
import { showToast } from '@/lib/toast'

type UseTicketCommentActionsOptions = {
  ticketId: number
  ticketTitle: string
  editingCommentId: number | null
  resetCreateForm: UseFormReset<TicketCommentFormOutput>
  clearEditingComment: () => void
  clearDeleteTarget: () => void
}

export function useTicketCommentActions({
  ticketId,
  ticketTitle,
  editingCommentId,
  resetCreateForm,
  clearEditingComment,
  clearDeleteTarget,
}: UseTicketCommentActionsOptions) {
  const createTicketComment = useCreateTicketComment()
  const updateTicketComment = useUpdateTicketComment()
  const deleteTicketComment = useDeleteTicketComment()

  const submittingDeleteCommentId = deleteTicketComment.isPending
    ? deleteTicketComment.variables?.commentId
    : undefined
  const submittingUpdateCommentId = updateTicketComment.isPending
    ? updateTicketComment.variables?.commentId
    : undefined

  const submitComment = (values: TicketCommentFormOutput) => {
    createTicketComment.mutate(
      {
        ticketId,
        body: values.body,
      },
      {
        onSuccess: () => {
          resetCreateForm(TICKET_COMMENT_FORM_DEFAULT_VALUES)
          showToast({
            title: 'コメントを投稿しました',
            message: `#${ticketId} ${ticketTitle}`,
          })
        },
      },
    )
  }

  const createErrorMessage = createTicketComment.isError
    ? getErrorMessage(createTicketComment.error, '再試行してください')
    : undefined

  const submitUpdatedComment = (commentId: number, values: TicketCommentFormOutput) => {
    updateTicketComment.mutate(
      {
        ticketId,
        commentId,
        body: values.body,
      },
      {
        onError: (error) => {
          showToast({
            title: 'コメントの更新に失敗しました',
            message: getErrorMessage(error, '再試行してください'),
            color: 'red',
          })
        },
        onSuccess: () => {
          if (editingCommentId === commentId) {
            clearEditingComment()
          }
          showToast({
            title: 'コメントを更新しました',
            message: `#${ticketId} ${ticketTitle}`,
          })
        },
      },
    )
  }

  const confirmDeleteComment = (commentToDelete: TicketComment | null) => {
    if (!commentToDelete) {
      return
    }

    deleteTicketComment.mutate(
      {
        ticketId,
        commentId: commentToDelete.id,
      },
      {
        onError: (error) => {
          showToast({
            title: 'コメントの削除に失敗しました',
            message: getErrorMessage(error, '再試行してください'),
            color: 'red',
          })
        },
        onSuccess: () => {
          showToast({
            title: 'コメントを削除しました',
            message: `#${ticketId} ${ticketTitle}`,
          })
          if (editingCommentId === commentToDelete.id) {
            clearEditingComment()
          }
          clearDeleteTarget()
        },
      },
    )
  }

  return {
    createTicketComment,
    updateTicketComment,
    deleteTicketComment,
    createErrorMessage,
    isDeleteModalBusy: deleteTicketComment.isPending,
    isSubmittingDelete: (commentId: number) => submittingDeleteCommentId === commentId,
    isSubmittingUpdate: (commentId: number) => submittingUpdateCommentId === commentId,
    submitComment,
    submitUpdatedComment,
    confirmDeleteComment,
  }
}
