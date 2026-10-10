import { Alert, Loader, Stack, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

import { useTasks } from '@/features/tasks/api/queries'
import { KanbanBoard } from '@/features/tasks/components/KanbanBoard'
import { useKanbanStore } from '@/features/tasks/stores/kanban.store'

export const Route = createFileRoute('/_authenticated/tasks')({
  component: TasksRoute,
})

function TasksRoute() {
  const tasksQuery = useTasks()
  const setTasks = useKanbanStore((state) => state.setTasks)

  useEffect(() => {
    if (tasksQuery.data !== undefined) {
      setTasks(tasksQuery.data)
    }
  }, [setTasks, tasksQuery.data])

  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Title order={2}>タスク</Title>
      </Stack>

      {tasksQuery.isLoading ? <Loader /> : null}
      {tasksQuery.isError ? (
        <Alert color="red" variant="light">
          Failed to load tasks.
        </Alert>
      ) : null}
      {tasksQuery.data !== undefined ? <KanbanBoard /> : null}
    </Stack>
  )
}
