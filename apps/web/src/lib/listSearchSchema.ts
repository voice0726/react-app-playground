import { z } from 'zod'

const optionalQuery = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return undefined
  },
  z.string().optional(),
)

export function createListSearchSchema<const SortableFields extends readonly [string, ...string[]]>(
  sortableFields: SortableFields,
) {
  return z.object({
    sort: z.preprocess(
      (value: unknown) =>
        typeof value === 'string' && sortableFields.includes(value) ? value : undefined,
      z.enum(sortableFields).optional(),
    ),
    order: z.preprocess(
      (value: unknown) => (value === 'asc' || value === 'desc' ? value : undefined),
      z.enum(['asc', 'desc']).optional(),
    ),
    q: optionalQuery,
  })
}
