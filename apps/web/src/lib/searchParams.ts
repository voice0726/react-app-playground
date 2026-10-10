import { defaultParseSearch } from '@tanstack/react-router'

export function parseSearchPreservingRawQuery(searchStr: string) {
  const search = defaultParseSearch(searchStr) as Record<string, unknown>
  const queryStr = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr
  const rawQuery = new URLSearchParams(queryStr).get('q')

  if (typeof search.q === 'number' && rawQuery !== null) {
    search.q = rawQuery
  }

  return search
}
