import { z } from 'zod'

export const invoiceSchema = z.object({
  number: z.string().min(1, '請求書番号を入力してください'),
  customerId: z.string().min(1, '顧客を選択してください'),
  amount: z.number({ error: () => '金額は数値で入力してください' }).positive('金額は 0 より大きい値を入力してください'),
  issueDate: z.string().min(1, '発行日を入力してください'),
  dueDate: z.string().min(1, '支払期日を入力してください'),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>
