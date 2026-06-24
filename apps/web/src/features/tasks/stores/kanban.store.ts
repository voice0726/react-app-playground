import { create } from 'zustand'

import type { Task, TaskStatus } from '@/features/tasks/types'

type KanbanStore = {
  tasks: Task[]
  activeTaskId: string | null
  setTasks: (tasks: Task[]) => void
  setActiveTaskId: (id: string | null) => void
  moveTask: (taskId: string, newStatus: TaskStatus) => void
}

export const useKanbanStore = create<KanbanStore>()((set) => ({
  tasks: [],
  activeTaskId: null,
  setTasks: (tasks) => set({ tasks }),
  setActiveTaskId: (id) => set({ activeTaskId: id }),
  moveTask: (taskId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: newStatus,
            }
          : task,
      ),
    })),
}))
