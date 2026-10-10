import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(1, 'タイトルを入力してください'),
  customerId: z.string().min(1, '顧客を選択してください'),
  amount: z.number({ error: () => '金額は数値で入力してください' }).positive('金額は 0 より大きい値を入力してください'),
  status: z.enum(['open', 'won', 'lost']),
})

export type DealFormValues = z.infer<typeof dealSchema>
