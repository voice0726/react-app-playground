import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Group, Paper, Stack, Text } from '@mantine/core'
import { IconCheck, IconPencil, IconTrash, IconX } from '@tabler/icons-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { TicketActorInfo } from '@/features/tickets/components/detail/TicketActorInfo'
import {
  TICKET_COMMENT_FORM_DEFAULT_VALUES,
  type TicketCommentFormInput,
  type TicketCommentFormOutput,
  ticketCommentFormValuesSchema,
} from '@/features/tickets/schemas/form'
import type { TicketComment } from '@/features/tickets/schemas/index'
import { formatDateTime } from '@/lib/date'
import { TicketCommentForm } from './TicketCommentForm'

type TicketCommentItemProps = {
  comment: TicketComment
  isOwner: boolean
  isEditing: boolean
  canEdit: boolean
  canDelete: boolean
  isDeleting: boolean
  isUpdating: boolean
  onStartEditing: () => void
  onDelete: () => void
  onCancelEditing: () => void
  onSubmitEdit: (values: TicketCommentFormOutput) => void
}

export function TicketCommentItem({
  comment,
  isOwner,
  isEditing,
  canEdit,
  canDelete,
  isDeleting,
  isUpdating,
  onStartEditing,
  onDelete,
  onCancelEditing,
  onSubmitEdit,
}: TicketCommentItemProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TicketCommentFormInput, unknown, TicketCommentFormOutput>({
    defaultValues: TICKET_COMMENT_FORM_DEFAULT_VALUES,
    resolver: zodResolver(ticketCommentFormValuesSchema),
  })

  useEffect(() => {
    if (!isEditing) {
      return
    }

    reset({ body: comment.body })
  }, [comment.body, isEditing, reset])

  return (
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Group align="flex-start" justify="space-between" wrap="wrap">
          <Group align="flex-start" flex="1" justify="space-between">
            <TicketActorInfo actor={comment.createdBy} fallback="不明なユーザー" />
            <Text c="dimmed" size="sm">
              {formatDateTime(comment.createdAt)}
            </Text>
          </Group>
          {isOwner ? (
            <Group gap="xs">
              <Button
                aria-label={`コメント ${comment.id} を編集`}
                color="gray"
                disabled={!canEdit}
                leftSection={<IconPencil size={14} />}
                size="xs"
                variant="subtle"
                onClick={onStartEditing}
              >
                編集
              </Button>
              <Button
                aria-label={`コメント ${comment.id} を削除`}
                color="red"
                disabled={!canDelete}
                leftSection={<IconTrash size={14} />}
                loading={isDeleting}
                size="xs"
                variant="subtle"
                onClick={onDelete}
              >
                削除
              </Button>
            </Group>
          ) : null}
        </Group>
        {isEditing ? (
          <TicketCommentForm
            bodyError={errors.body?.message}
            bodyField={register('body')}
            cancelButton={
              <Button
                color="gray"
                leftSection={<IconX size={16} />}
                type="button"
                variant="light"
                onClick={() => {
                  reset({ body: comment.body })
                  onCancelEditing()
                }}
              >
                キャンセル
              </Button>
            }
            isSubmitting={isUpdating}
            label="コメントを編集"
            submitIcon={<IconCheck size={16} />}
            submitLabel="更新する"
            onSubmit={handleSubmit(onSubmitEdit)}
          />
        ) : (
          <Text style={{ whiteSpace: 'pre-wrap' }}>{comment.body}</Text>
        )}
      </Stack>
    </Paper>
  )
}
