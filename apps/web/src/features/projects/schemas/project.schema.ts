import { z } from 'zod'

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

export const projectSchema = z
  .object({
    name: z.string().trim().min(1, '名前を入力してください'),
    description: z.string(),
    owner: z.string().trim().min(1, '担当者を入力してください'),
    startDate: z.string().regex(dateOnlyPattern, '開始日を入力してください'),
    dueDate: z.string().regex(dateOnlyPattern, '期日は有効な日付で入力してください').or(z.literal('')),
    status: z.string().trim().min(1, 'ステータスを入力してください'),
  })
  .refine(
    (values) => values.dueDate === '' || values.dueDate >= values.startDate,
    { path: ['dueDate'], message: '期日は開始日以降にしてください' },
  )

export type ProjectFormValues = z.infer<typeof projectSchema>
