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
  const schema = z.object({
    sort: z.unknown().optional(),
    order: z.preprocess(
      (value: unknown) => (value === 'asc' || value === 'desc' ? value : undefined),
      z.enum(['asc', 'desc']).optional(),
    ),
    q: optionalQuery,
  })

  return schema.transform(({ sort, order, q }) => {
    const isSortable = typeof sort === 'string' && sortableFields.includes(sort)
    const invalidSort = sort !== undefined && !isSortable

    return {
      sort: isSortable ? sort : undefined,
      order: invalidSort ? undefined : order,
      q,
    }
  })
}
