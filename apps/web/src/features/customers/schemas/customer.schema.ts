import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Phone is required'),
  status: z.enum(['active', 'inactive']),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
