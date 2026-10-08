import * as z from 'zod'

export const TICKETS_SEARCH_MAX_PAGE = 1_000_000
export const TICKETS_SEARCH_MAX_PAGE_SIZE = 100

export const TICKETS_SEARCH_DEFAULT = {
  q: undefined,
  status: 'all',
  sortBy: 'id',
  sortOrder: 'asc',
  page: 1,
  pageSize: 10,
} as const

export const ticketsSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .transform((v) => v || undefined)
    .optional()
    .catch(undefined),
  status: z
    .enum(['all', 'open', 'closed'])
    .catch(TICKETS_SEARCH_DEFAULT.status)
    .default(TICKETS_SEARCH_DEFAULT.status),
  sortBy: z
    .enum(['id', 'created_at', 'updated_at'])
    .catch(TICKETS_SEARCH_DEFAULT.sortBy)
    .default(TICKETS_SEARCH_DEFAULT.sortBy),
  sortOrder: z
    .enum(['asc', 'dsc'])
    .catch(TICKETS_SEARCH_DEFAULT.sortOrder)
    .default(TICKETS_SEARCH_DEFAULT.sortOrder),
  page: z.coerce
    .number()
    .int()
    .min(1)
    .max(TICKETS_SEARCH_MAX_PAGE)
    .catch(TICKETS_SEARCH_DEFAULT.page)
    .default(TICKETS_SEARCH_DEFAULT.page),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(TICKETS_SEARCH_MAX_PAGE_SIZE)
    .catch(TICKETS_SEARCH_DEFAULT.pageSize)
    .default(TICKETS_SEARCH_DEFAULT.pageSize),
})

export type TicketsSearch = z.infer<typeof ticketsSearchSchema>

export const ticketsSearchFormValuesSchema = z.object({
  q: z.string().trim(),
  status: z.enum(['all', 'open', 'closed']),
  sortBy: z.enum(['id', 'created_at', 'updated_at']),
  sortOrder: z.enum(['asc', 'dsc']),
})

export type TicketsSearchFormInput = z.input<typeof ticketsSearchFormValuesSchema>
export type TicketsSearchFormOutput = z.output<typeof ticketsSearchFormValuesSchema>
