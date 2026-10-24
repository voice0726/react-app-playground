import { createListSearchSchema } from '@/lib/listSearchSchema'

export const invoiceSearchSchema = createListSearchSchema([
  'number',
  'customerId',
  'amount',
  'issueDate',
  'dueDate',
  'status',
], true)
