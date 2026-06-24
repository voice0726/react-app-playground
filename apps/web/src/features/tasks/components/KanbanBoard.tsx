import { Alert, Modal, SimpleGrid, Stack } from '@mantine/core'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import React, { useMemo, useState } from 'react'

import { useCreateTask, useUpdateTaskStatus } from '@/features/tasks/api/mutations'
import { KanbanColumn } from '@/features/tasks/components/KanbanColumn'
import { TaskCard } from '@/features/tasks/components/TaskCard'
import { TaskForm } from '@/features/tasks/components/TaskForm'
import type { TaskFormValues } from '@/features/tasks/schemas/task.schema'
import { useKanbanStore } from '@/features/tasks/stores/kanban.store'
import { isTaskStatus, taskStatuses, type Task, type TaskStatus } from '@/features/tasks/types'

const columnLabels: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
}

function groupTasks(tasks: Task[]): Record<TaskStatus, Task[]> {
  return {
    TODO: tasks.filter((task) => task.status === 'TODO'),
    IN_PROGRESS: tasks.filter((task) => task.status === 'IN_PROGRESS'),
    DONE: tasks.filter((task) => task.status === 'DONE'),
  }
}

function getTaskStatus(tasks: Task[], id: UniqueIdentifier): TaskStatus | null {
  const droppableId = String(id)

  if (isTaskStatus(droppableId)) {
    return droppableId
  }

  return tasks.find((task) => task.id === droppableId)?.status ?? null
}

export function KanbanBoard() {
  const tasks = useKanbanStore((state) => state.tasks)
  const activeTaskId = useKanbanStore((state) => state.activeTaskId)
  const setActiveTaskId = useKanbanStore((state) => state.setActiveTaskId)
  const moveTask = useKanbanStore((state) => state.moveTask)
  const createTask = useCreateTask()
  const updateTaskStatus = useUpdateTaskStatus()
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )
  const tasksByStatus = useMemo(() => groupTasks(tasks), [tasks])
  const activeTask = activeTaskId === null ? undefined : tasks.find((task) => task.id === activeTaskId)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id)
    const task = tasks.find((item) => item.id === taskId)
    const nextStatus = event.over === null ? null : getTaskStatus(tasks, event.over.id)

    setActiveTaskId(null)

    if (task === undefined || nextStatus === null || task.status === nextStatus) {
      return
    }

    moveTask(taskId, nextStatus)
    updateTaskStatus.mutate({ id: taskId, status: nextStatus })
  }

  const handleCreate = async (values: TaskFormValues) => {
    await createTask.mutateAsync(values)
    setNewTaskStatus(null)
  }

  return (
    <Stack gap="md">
      {updateTaskStatus.isError ? (
        <Alert color="red" variant="light">
          Failed to update task status.
        </Alert>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          {taskStatuses.map((status) => (
            <KanbanColumn
              key={status}
              title={columnLabels[status]}
              status={status}
              tasks={tasksByStatus[status]}
              onAddTask={setNewTaskStatus}
            />
          ))}
        </SimpleGrid>
        <DragOverlay>{activeTask === undefined ? null : <TaskCard task={activeTask} isDragOverlay />}</DragOverlay>
      </DndContext>

      <Modal
        opened={newTaskStatus !== null}
        onClose={() => setNewTaskStatus(null)}
        title={`New ${newTaskStatus === null ? 'Task' : columnLabels[newTaskStatus]} Task`}
      >
        <TaskForm
          initialValues={{
            title: '',
            description: '',
            status: newTaskStatus ?? 'TODO',
          }}
          isSubmitting={createTask.isPending}
          onSubmit={handleCreate}
        />
      </Modal>
    </Stack>
  )
}
