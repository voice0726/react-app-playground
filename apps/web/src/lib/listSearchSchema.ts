import { z } from 'zod'

import { isPageSize } from '@/lib/pagination'

const optionalQuery = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    return undefined
  },
  z.string().optional(),
)

const optionalPage = z.preprocess(
  (value: unknown) => (typeof value === 'string' ? Number(value) : value),
  z.number().int().min(2).optional().catch(undefined),
)

const optionalPageSize = z.preprocess(
  (value: unknown) => (typeof value === 'string' ? Number(value) : value),
  z.number().optional().catch(undefined),
)

export function createListSearchSchema<const SortableFields extends readonly [string, ...string[]]>(
  sortableFields: SortableFields,
  includeOverdue = false,
) {
  const schema = z.object({
    sort: z.unknown().optional(),
    order: z.preprocess(
      (value: unknown) => (value === 'asc' || value === 'desc' ? value : undefined),
      z.enum(['asc', 'desc']).optional(),
    ),
    q: optionalQuery,
    overdue: z.preprocess((value: unknown) => value === 'true' || value === true, z.boolean()).optional(),
    page: optionalPage,
    pageSize: optionalPageSize,
  })

  return schema.transform(({ sort, order, q, overdue, page, pageSize }) => {
    const isSortable = typeof sort === 'string' && sortableFields.includes(sort)
    const invalidSort = sort !== undefined && !isSortable

    return {
      sort: isSortable ? sort : undefined,
      order: invalidSort ? undefined : order,
      q,
      ...(includeOverdue ? { overdue: overdue === true ? true : undefined } : {}),
      page,
      pageSize: isPageSize(pageSize) ? pageSize : undefined,
    }
  })
}
