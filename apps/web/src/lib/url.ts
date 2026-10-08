type QueryValue = string | number | boolean | null | undefined

type QueryRecord = Record<string, QueryValue | QueryValue[]>

export const toSearchParams = (query: QueryRecord) => {
  const params = new URLSearchParams()

  for (const [key, rawValue] of Object.entries(query)) {
    const values = Array.isArray(rawValue) ? rawValue : [rawValue]

    for (const value of values) {
      if (value == null || value === '') {
        continue
      }

      params.append(key, String(value))
    }
  }

  return params
}

const DUMMY_BASE = 'http://localhost'

export const withQuery = (path: string, query?: QueryRecord) => {
  if (!query) {
    return path
  }

  const url = new URL(path, DUMMY_BASE)

  for (const [key, value] of toSearchParams(query)) {
    url.searchParams.append(key, value)
  }

  return url.pathname + url.search
}
