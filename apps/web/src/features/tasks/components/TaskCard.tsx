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
  { value: 'TODO', label: 'Todo' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'DONE', label: 'Done' },
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
          aria-label={`Drag ${task.title}`}
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
              aria-label={`Move ${task.title}`}
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
