import { zodResolver } from '@hookform/resolvers/zod'
import { Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core'
import { IconMessageCircle, IconSend } from '@tabler/icons-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  TICKET_COMMENT_FORM_DEFAULT_VALUES,
  type TicketCommentFormInput,
  type TicketCommentFormOutput,
  ticketCommentFormValuesSchema,
} from '@/features/tickets/schemas/form'
import type { TicketComment, TicketComments } from '@/features/tickets/schemas/index'
import { TicketCommentDeleteModal } from './TicketCommentDeleteModal'
import { TicketCommentForm } from './TicketCommentForm'
import { TicketCommentItem } from './TicketCommentItem'
import { useTicketCommentActions } from './useTicketCommentActions'

type TicketCommentsPanelProps = {
  ticketId: number
  ticketTitle: string
  comments: TicketComments
  currentUserId?: string
}

export function TicketCommentsPanel({
  ticketId,
  ticketTitle,
  comments,
  currentUserId,
}: TicketCommentsPanelProps) {
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null)
  const [commentToDelete, setCommentToDelete] = useState<TicketComment | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketCommentFormInput, unknown, TicketCommentFormOutput>({
    defaultValues: TICKET_COMMENT_FORM_DEFAULT_VALUES,
    resolver: zodResolver(ticketCommentFormValuesSchema),
  })

  const isEditingComment = (commentId: number) => editingCommentId === commentId

  const {
    createTicketComment,
    updateTicketComment,
    createErrorMessage,
    isDeleteModalBusy,
    isSubmittingDelete,
    isSubmittingUpdate,
    submitComment,
    submitUpdatedComment,
    confirmDeleteComment,
  } = useTicketCommentActions({
    ticketId,
    ticketTitle,
    editingCommentId,
    resetCreateForm: reset,
    clearEditingComment: () => {
      setEditingCommentId(null)
    },
    clearDeleteTarget: () => {
      setCommentToDelete(null)
    },
  })

  const isCommentOwner = (comment: TicketComment) =>
    currentUserId != null &&
    comment.createdBy?.id != null &&
    comment.createdBy.id === currentUserId

  const canEditComment = (comment: TicketComment) =>
    isCommentOwner(comment) &&
    !isSubmittingDelete(comment.id) &&
    !updateTicketComment.isPending &&
    editingCommentId === null
  const canDeleteComment = (comment: TicketComment) =>
    isCommentOwner(comment) && !isSubmittingUpdate(comment.id)

  const submitCommentForm = handleSubmit(submitComment)

  return (
    <Stack gap="md">
      <TicketCommentDeleteModal
        comment={commentToDelete ? { id: commentToDelete.id, body: commentToDelete.body } : null}
        isDeleting={isDeleteModalBusy}
        opened={commentToDelete !== null}
        onClose={() => {
          if (isDeleteModalBusy) {
            return
          }

          setCommentToDelete(null)
        }}
        onConfirm={() => {
          confirmDeleteComment(commentToDelete)
        }}
      />

      <Group gap="xs">
        <ThemeIcon color="grape" radius="xl" size="sm" variant="light">
          <IconMessageCircle size={14} />
        </ThemeIcon>
        <Text fw={700}>コメント</Text>
      </Group>

      <Paper p="md" radius="md" withBorder>
        <TicketCommentForm
          bodyError={errors.body?.message}
          bodyField={register('body')}
          errorMessage={createErrorMessage}
          errorTitle="コメントを投稿できませんでした"
          isSubmitting={createTicketComment.isPending}
          label="コメントを追加"
          placeholder="調査状況や対応内容を共有できます"
          submitIcon={<IconSend size={16} />}
          submitLabel="投稿する"
          onSubmit={submitCommentForm}
        />
      </Paper>

      {comments.items.length === 0 ? (
        <Paper p="md" radius="md" withBorder>
          <Text c="dimmed" size="sm">
            まだコメントはありません。
          </Text>
        </Paper>
      ) : (
        <Stack gap="sm">
          {comments.items.map((comment) => (
            <TicketCommentItem
              key={comment.id}
              canDelete={canDeleteComment(comment)}
              canEdit={canEditComment(comment)}
              comment={comment}
              isDeleting={isSubmittingDelete(comment.id)}
              isEditing={isEditingComment(comment.id)}
              isOwner={isCommentOwner(comment)}
              isUpdating={isSubmittingUpdate(comment.id)}
              onCancelEditing={() => {
                setEditingCommentId(null)
              }}
              onDelete={() => {
                setCommentToDelete(comment)
              }}
              onStartEditing={() => {
                setEditingCommentId(comment.id)
              }}
              onSubmitEdit={(values) => {
                submitUpdatedComment(comment.id, values)
              }}
            />
          ))}
        </Stack>
      )}
    </Stack>
  )
}
