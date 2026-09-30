import { request } from '@playwright/test'
import { access } from 'node:fs/promises'
import { appOrigin, storageStateFor } from './helpers/auth'

export default async function globalSetup() {
  const anonymous = await request.newContext({ baseURL: appOrigin })
  try {
    const health = await anonymous.get('/api/healthz')
    if (!health.ok()) throw new Error(`Backend health check failed: ${health.status()}`)
    const session = await anonymous.get('/auth/me')
    if (session.status() !== 401) throw new Error(`Anonymous auth check failed: ${session.status()}`)
  } finally {
    await anonymous.dispose()
  }

  const ids: string[] = []
  for (const user of ['a', 'b'] as const) {
    const state = storageStateFor(user)
    await access(state)
    const context = await request.newContext({ baseURL: appOrigin, storageState: state })
    try {
      const response = await context.get('/auth/me')
      if (!response.ok()) throw new Error(`User ${user} storage state is not authenticated at ${appOrigin}: ${response.status()}`)
      const body = await response.json() as { user_id?: unknown }
      if (typeof body.user_id !== 'string' || body.user_id === '') throw new Error(`User ${user} session has no user_id`)
      ids.push(body.user_id)
    } finally {
      await context.dispose()
    }
  }
  if (ids[0] === ids[1]) throw new Error('E2E storage states must belong to different users')
}
