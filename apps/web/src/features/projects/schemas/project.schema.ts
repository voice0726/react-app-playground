import { z } from 'zod'

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required'),
    description: z.string(),
    owner: z.string().trim().min(1, 'Owner is required'),
    startDate: z.string().regex(dateOnlyPattern, 'Start date is required'),
    dueDate: z.string().regex(dateOnlyPattern, 'Due date must be a valid date').or(z.literal('')),
    status: z.string().trim().min(1, 'Status is required'),
  })
  .refine(
    (values) => values.dueDate === '' || values.dueDate >= values.startDate,
    { path: ['dueDate'], message: 'Due date must be on or after the start date' },
  )

export type ProjectFormValues = z.infer<typeof projectSchema>
