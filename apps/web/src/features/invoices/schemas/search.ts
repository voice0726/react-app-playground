import { z } from 'zod'

const optionalSearchString = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
      : typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : undefined,
  z.string().optional(),
)

export const invoiceSearchSchema = z.object({
  sort: z.preprocess((value) => (typeof value === 'string' ? value : undefined), z.string().optional()),
  order: z.preprocess(
    (value) => (value === 'asc' || value === 'desc' ? value : undefined),
    z.enum(['asc', 'desc']).optional(),
  ),
  q: optionalSearchString,
})
