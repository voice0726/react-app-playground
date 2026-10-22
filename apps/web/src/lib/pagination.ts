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

// 読み込み中や取得失敗でも一覧を消さない。消すと検索欄のフォーカスが外れ、入力中の検索語を直せなくなる
export function pageToShow<T>(request: ListRequest, { data }: Pick<PageQueryState<T>, 'data'>): PaginatedResponse<T> {
  return data ?? emptyPage<T>(request)
}

// 行が無い失敗は一覧の中で伝える。表示中の行を残したまま再取得に失敗したときだけ、一覧の外で伝える
export function failedToRefresh<T>({ data, isError }: Pick<PageQueryState<T>, 'data' | 'isError'>): boolean {
  return isError && data !== undefined && data.items.length > 0
}
export function toPageParam(page: number): number | undefined {
  return page > 1 ? page : undefined
}
