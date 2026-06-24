import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.number({ error: () => 'Amount must be a number' }).positive('Amount must be positive'),
  status: z.enum(['open', 'won', 'lost']),
})

export type DealFormValues = z.infer<typeof dealSchema>
