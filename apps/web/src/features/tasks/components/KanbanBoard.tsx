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
import { useMemo, useRef, useState } from 'react'

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
  const statusChangeLock = useRef(false)
  const createSession = useRef(0)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  )
  const tasksByStatus = useMemo(() => groupTasks(tasks), [tasks])
  const taskInitialValues = useMemo<TaskFormValues>(
    () => ({ title: '', description: '', status: newTaskStatus ?? 'TODO' }),
    [newTaskStatus],
  )
  const activeTask = activeTaskId === null ? undefined : tasks.find((task) => task.id === activeTaskId)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }

  const handleOpenCreate = (status: TaskStatus) => {
    createSession.current += 1
    createTask.reset()
    setNewTaskStatus(status)
  }

  const handleCloseCreate = () => {
    createSession.current += 1
    createTask.reset()
    setNewTaskStatus(null)
  }

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    const task = useKanbanStore.getState().tasks.find((item) => item.id === taskId)

    if (statusChangeLock.current || task === undefined || task.status === nextStatus) {
      return
    }

    statusChangeLock.current = true
    moveTask(taskId, nextStatus)
    try {
      await updateTaskStatus.mutateAsync({ id: taskId, status: nextStatus })
    } catch {
      moveTask(taskId, task.status)
    } finally {
      statusChangeLock.current = false
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const taskId = String(event.active.id)
    const nextStatus = event.over === null ? null : getTaskStatus(tasks, event.over.id)

    setActiveTaskId(null)

    if (nextStatus !== null) {
      void handleStatusChange(taskId, nextStatus)
    }
  }

  const handleCreate = async (values: TaskFormValues) => {
    const session = createSession.current
    try {
      await createTask.mutateAsync(values)
      if (session === createSession.current) {
        handleCloseCreate()
      }
    } catch {
      return
    }
  }

  return (
    <Stack gap="md">
      {updateTaskStatus.isError ? (
        <Alert color="red" variant="light" role="alert">
          タスクの状態を保存できませんでした。元の状態に戻しました。
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
              isStatusChangePending={updateTaskStatus.isPending}
              onStatusChange={(taskId, nextStatus) => void handleStatusChange(taskId, nextStatus)}
              onAddTask={handleOpenCreate}
            />
          ))}
        </SimpleGrid>
        <DragOverlay>{activeTask === undefined ? null : <TaskCard task={activeTask} isDragOverlay />}</DragOverlay>
      </DndContext>

      <Modal
        opened={newTaskStatus !== null}
        onClose={handleCloseCreate}
        title={`New ${newTaskStatus === null ? 'Task' : columnLabels[newTaskStatus]} Task`}
      >
        <TaskForm
          initialValues={taskInitialValues}
          isSubmitting={createTask.isPending}
          error={createTask.isError ? 'タスクを保存できませんでした。入力内容を確認して再試行してください。' : undefined}
          onSubmit={handleCreate}
        />
      </Modal>
    </Stack>
  )
}
