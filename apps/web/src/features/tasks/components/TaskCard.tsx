import { ActionIcon, Card, Group, NativeSelect, Stack, Text } from '@mantine/core'
import { IconGripVertical } from '@tabler/icons-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type CSSProperties } from 'react'

import type { Task, TaskStatus } from '@/features/tasks/types'

type TaskCardProps = {
  task: Task
  isDragOverlay?: boolean
  isStatusChangePending?: boolean
  onStatusChange?: (taskId: string, status: TaskStatus) => void
}

const statusOptions = [
  { value: 'TODO', label: '未着手' },
  { value: 'IN_PROGRESS', label: '進行中' },
  { value: 'DONE', label: '完了' },
] satisfies { value: TaskStatus; label: string }[]

export function TaskCard({ task, isDragOverlay = false, isStatusChangePending = false, onStatusChange }: TaskCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    disabled: isDragOverlay || isStatusChangePending,
  })
  const style: CSSProperties = {
    opacity: isDragging ? 0.45 : 1,
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={isDragOverlay ? undefined : setNodeRef}
      withBorder
      radius="sm"
      padding="sm"
      shadow={isDragOverlay ? 'md' : undefined}
      style={isDragOverlay ? undefined : style}
    >
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <ActionIcon
          aria-label={`${task.title} をドラッグ`}
          variant="subtle"
          color="gray"
          {...attributes}
          {...listeners}
          style={{ touchAction: 'none' }}
        >
          <IconGripVertical size={16} />
        </ActionIcon>
        <Stack gap={4}>
          <Text fw={600}>{task.title}</Text>
          <Text size="sm" c="dimmed">
            {task.description}
          </Text>
          {!isDragOverlay && onStatusChange !== undefined ? (
            <NativeSelect
              aria-label={`${task.title} を移動`}
              size="xs"
              data={statusOptions}
              value={task.status}
              disabled={isStatusChangePending}
              onChange={(value) => {
                const status = value.currentTarget.value
                if (status === 'TODO' || status === 'IN_PROGRESS' || status === 'DONE') {
                  onStatusChange(task.id, status)
                }
              }}
            />
          ) : null}
        </Stack>
      </Group>
    </Card>
  )
}
