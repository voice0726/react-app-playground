import { http, HttpResponse } from 'msw'

import { readJsonObject, stringValue } from './utils'

type MockSessionUser = {
  id: string
  name: string
  email: string
}

export type MockSession = {
  user: MockSessionUser
  session: {
    id: string
    userId: string
    token: string
    createdAt: string
    updatedAt: string
    expiresAt: string
  }
}

const demoUser: MockSessionUser = {
  id: 'user-demo',
  name: 'Demo User',
  email: 'demo@example.com',
}

let currentSession: MockSession | null = null

function createSession(): MockSession {
  const now = new Date().toISOString()

  return {
    user: demoUser,
    session: {
      id: 'session-demo',
      userId: demoUser.id,
      token: 'mock-session-token',
      createdAt: now,
      updatedAt: now,
      expiresAt: '2026-12-31T23:59:59.999Z',
    },
  }
}

export const authHandlers = [
  http.post('*/api/auth/sign-in/email', async ({ request }) => {
    const body = await readJsonObject(request)
    const email = stringValue(body.email)
    const password = stringValue(body.password)

    if (email !== 'demo@example.com' || password !== 'password') {
      return HttpResponse.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    currentSession = createSession()

    return HttpResponse.json(currentSession)
  }),
  http.get('*/api/auth/get-session', () => HttpResponse.json(currentSession)),
  http.post('*/api/auth/sign-out', () => {
    currentSession = null

    return HttpResponse.json({ success: true })
  }),
]
