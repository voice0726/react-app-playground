import { z } from 'zod'

const optionalSearchText = z.preprocess(
  (value: unknown) => (typeof value === 'string' ? value : undefined),
  z.string().optional(),
)

const optionalQuery = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return undefined
  },
  z.string().optional(),
)

export const listSearchSchema = z.object({
  sort: optionalSearchText,
  order: z.preprocess(
    (value: unknown) => (value === 'asc' || value === 'desc' ? value : undefined),
    z.enum(['asc', 'desc']).optional(),
  ),
  q: optionalQuery,
})
