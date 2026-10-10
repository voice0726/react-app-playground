import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'

import { TaskCard } from '@/features/tasks/components/TaskCard'
import type { Task, TaskStatus } from '@/features/tasks/types'

type KanbanColumnProps = {
  title: string
  status: TaskStatus
  tasks: Task[]
  isStatusChangePending: boolean
  onStatusChange: (taskId: string, status: TaskStatus) => void
  onAddTask: (status: TaskStatus) => void
}

export function KanbanColumn({ title, status, tasks, isStatusChangePending, onStatusChange, onAddTask }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <Paper ref={setNodeRef} withBorder radius="sm" p="md" mih={360}>
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Title order={3} size="h4">
              {title}
            </Title>
            <Text c="dimmed" size="sm">
              {tasks.length}
            </Text>
          </Group>
          <Button
            size="xs"
            variant="light"
            aria-label={`Add ${title} task`}
            onClick={() => onAddTask(status)}
          >
            Add Task
          </Button>
        </Group>
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <Stack gap="sm">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isStatusChangePending={isStatusChangePending}
                onStatusChange={onStatusChange}
              />
            ))}
          </Stack>
        </SortableContext>
      </Stack>
    </Paper>
  )
}
