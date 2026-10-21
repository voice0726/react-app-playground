import { HttpResponse } from 'msw'

export function createId(prefix: string, length: number): string {
  return `${prefix}-${String(length + 1).padStart(3, '0')}`
}

export function notFound(resource: string): Response {
  return HttpResponse.json({ message: `${resource} not found` }, { status: 404 })
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null)

  if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>
  }

  return {}
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

// バックエンドの一覧 API（internal/shared/pagination）と同じ上限と検証にそろえる
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const MAX_QUERY_LENGTH = 200

type ListOptions<T, K extends keyof T & string> = {
  sortableFields: readonly K[]
  defaultSort: K
  matches: (item: T, query: string) => boolean
}

function parsePositive(value: string | null, max?: number): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined
  const parsed = Number(value)
  return parsed >= 1 && (max === undefined || parsed <= max) ? parsed : undefined
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right
  const a = String(left)
  const b = String(right)
  return a < b ? -1 : a > b ? 1 : 0
}

function invalidListQuery(): Response {
  return HttpResponse.json({ message: 'Invalid list query.' }, { status: 400 })
}

// page / pageSize が無ければ配列を、あれば { items, total, page, pageSize } を返す
export function listResponse<T extends { id: string }, K extends keyof T & string>(
  request: Request,
  items: readonly T[],
  options: ListOptions<T, K>,
): Response {
  const params = new URL(request.url).searchParams
  const paginated = params.has('page') || params.has('pageSize')
  const page = params.has('page') ? parsePositive(params.get('page')) : 1
  const pageSize = params.has('pageSize') ? parsePositive(params.get('pageSize'), MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  const query = params.get('q')?.trim() ?? ''
  const sort = params.get('sort') ?? options.defaultSort
  const order = params.get('order')?.toLowerCase() ?? 'asc'

  // バックエンドは utf8.RuneCountInString で数えるので、UTF-16 の length ではなくコードポイント数で比べる
  if (page === undefined || pageSize === undefined || [...query].length > MAX_QUERY_LENGTH) {
    return invalidListQuery()
  }
  if (!options.sortableFields.some((field) => field === sort) || (order !== 'asc' && order !== 'desc')) {
    return invalidListQuery()
  }

  const sortKey = sort as K
  const direction = order === 'desc' ? -1 : 1
  const filtered = query === '' ? items : items.filter((item) => options.matches(item, query.toLowerCase()))
  const sorted = filtered.toSorted(
    (left, right) =>
      direction * (compareValues(left[sortKey], right[sortKey]) || compareValues(left.id, right.id)),
  )

  if (!paginated) return HttpResponse.json(sorted)

  const start = (page - 1) * pageSize
  return HttpResponse.json({
    items: sorted.slice(start, start + pageSize),
    total: sorted.length,
    page,
    pageSize,
  })
}
