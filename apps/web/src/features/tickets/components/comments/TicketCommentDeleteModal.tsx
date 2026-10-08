import { Button, Group, Modal, Paper, Stack, Text } from '@mantine/core'

type TicketCommentDeleteModalProps = {
  opened: boolean
  comment: {
    id: number
    body: string
  } | null
  isDeleting: boolean
  onClose: () => void
  onConfirm: () => void
}

export function TicketCommentDeleteModal({
  opened,
  comment,
  isDeleting,
  onClose,
  onConfirm,
}: TicketCommentDeleteModalProps) {
  const isConfirmDisabled = comment === null || isDeleting

  return (
    <Modal centered onClose={onClose} opened={opened} title="コメントを削除">
      <Stack gap="lg">
        <Stack gap={4}>
          <Text size="sm">この操作は取り消せません。削除対象を確認してください。</Text>
          {comment ? (
            <Paper p="sm" radius="md" withBorder bg="gray.0">
              <Stack gap={6}>
                <Text c="dimmed" fw={700} size="xs">
                  削除対象のコメント
                </Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {comment.body}
                </Text>
              </Stack>
            </Paper>
          ) : null}
        </Stack>
        <Group justify="flex-end">
          <Button onClick={onClose} variant="default">
            キャンセル
          </Button>
          <Button
            color="red"
            disabled={isConfirmDisabled}
            loading={isDeleting}
            onClick={() => {
              if (!comment) {
                return
              }

              onConfirm()
            }}
          >
            削除する
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}
