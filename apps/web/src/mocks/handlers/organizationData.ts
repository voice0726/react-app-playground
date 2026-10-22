import { MOCK_ORGANIZATION_ID } from './organizations'

export function organizationData<T>(seed: readonly T[]) {
  const data = new Map<string, T[]>()
  const snapshot = (id: string) => {
    if (!data.has(id)) data.set(id, id === MOCK_ORGANIZATION_ID ? structuredClone([...seed]) : [])
    return data.get(id) ?? []
  }
  return {
    get: (request: Request) => snapshot(request.headers.get('X-Organization-ID') ?? ''),
    set: (request: Request, items: T[]) => data.set(request.headers.get('X-Organization-ID') ?? '', items),
    snapshot,
    reset: () => data.clear(),
  }
}
