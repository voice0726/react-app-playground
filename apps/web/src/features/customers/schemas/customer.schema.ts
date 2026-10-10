import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, '名前を入力してください'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  phone: z.string().min(1, '電話番号を入力してください'),
  status: z.enum(['active', 'inactive']),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
