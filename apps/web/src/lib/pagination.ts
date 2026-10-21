const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

type SortOrder = 'asc' | 'desc'

export type PaginatedResponse<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export type ListSearch = {
  sort?: string
  order?: SortOrder
  q?: string
  page?: number
  pageSize?: number
}

export type ListRequest = {
  page: number
  pageSize: number
  q?: string
  sort?: string
  order?: SortOrder
}

export function isPageSize(value: unknown): value is (typeof PAGE_SIZE_OPTIONS)[number] {
  return PAGE_SIZE_OPTIONS.some((option) => option === value)
}

export function toListRequest(search: ListSearch): ListRequest {
  const q = search.q?.trim()
  // 片方だけ渡すと画面の並び表示とサーバーの並びが食い違うので、列と向きは揃ったときだけ送る
  const sorted = search.sort !== undefined && search.order !== undefined

  return {
    page: search.page ?? 1,
    pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
    ...(q === undefined || q === '' ? {} : { q }),
    ...(sorted ? { sort: search.sort, order: search.order } : {}),
  }
}

export function buildListUrl(path: string, request: ListRequest): string {
  const params = new URLSearchParams({
    page: String(request.page),
    pageSize: String(request.pageSize),
  })

  if (request.q !== undefined) params.set('q', request.q)
  if (request.sort !== undefined) params.set('sort', request.sort)
  if (request.order !== undefined) params.set('order', request.order)

  return `${path}?${params.toString()}`
}

export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize))
}

type PageQueryState<T> = {
  data: PaginatedResponse<T> | undefined
  isError: boolean
  isFetching: boolean
  isPlaceholderData: boolean
}

// 削除や絞り込みで件数が減ると、URL のページが末尾を越える。そのときだけ移動先の末尾ページを返す
// 再取得中のキャッシュは追加前の件数のことがあり、有効なページから戻してしまうので取得後だけ判定する
export function outOfRangeLastPage(
  requestedPage: number,
  { data, isFetching, isPlaceholderData }: Omit<PageQueryState<unknown>, 'isError'>,
): number | undefined {
  if (data === undefined || isPlaceholderData || isFetching) return undefined
  const lastPage = pageCount(data.total, data.pageSize)
  return requestedPage > lastPage ? lastPage : undefined
}

function emptyPage<T>(request: ListRequest): PaginatedResponse<T> {
  return { items: [], total: 0, page: request.page, pageSize: request.pageSize }
}

// 取得に失敗した条件でも一覧を消さず、検索欄から条件を直せるようにする
export function pageToShow<T>(
  request: ListRequest,
  { data, isError }: Pick<PageQueryState<T>, 'data' | 'isError'>,
): PaginatedResponse<T> | undefined {
  return data ?? (isError ? emptyPage<T>(request) : undefined)
}

// keepPreviousData は直前の条件が失敗していると何も返さず、条件を直す途中で一覧が消える
export function keepPreviousPage<T>(request: ListRequest) {
  return (
    previousData: PaginatedResponse<T> | undefined,
    previousQuery: { state: { status: string } } | undefined,
  ): PaginatedResponse<T> | undefined =>
    previousData ?? (previousQuery?.state.status === 'error' ? emptyPage<T>(request) : undefined)
}

export function toPageParam(page: number): number | undefined {
  return page > 1 ? page : undefined
}
