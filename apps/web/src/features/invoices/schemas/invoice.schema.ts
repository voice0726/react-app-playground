import { z } from 'zod'

export const invoiceSchema = z.object({
  number: z.string().min(1, 'Invoice number is required'),
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.number({ error: () => 'Amount must be a number' }).positive('Amount must be positive'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']),
})

export type InvoiceFormValues = z.infer<typeof invoiceSchema>
