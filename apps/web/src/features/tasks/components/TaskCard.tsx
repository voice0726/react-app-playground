import { ActionIcon, Card, Group, Stack, Text } from '@mantine/core'
import { IconGripVertical } from '@tabler/icons-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import React, { type CSSProperties } from 'react'

import type { Task } from '@/features/tasks/types'

type TaskCardProps = {
  task: Task
  isDragOverlay?: boolean
}

export function TaskCard({ task, isDragOverlay = false }: TaskCardProps) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
    disabled: isDragOverlay,
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
        </Stack>
      </Group>
    </Card>
  )
}
