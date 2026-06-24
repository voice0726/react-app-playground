import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
})

export type TaskFormValues = z.infer<typeof taskSchema>
