import { describe, expect, it } from 'vitest'

describe('auth handlers', () => {
  it('rejects invalid email sign-in credentials', async () => {
    const response = await fetch('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'password',
      }),
    })

    expect(response.status).toBe(401)
  })

  it('stores and clears a demo session', async () => {
    const signInResponse = await fetch('http://localhost/api/auth/sign-in/email', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        email: 'demo@example.com',
        password: 'password',
      }),
    })

    expect(signInResponse.ok).toBe(true)

    const sessionResponse = await fetch('http://localhost/api/auth/get-session')
    const session = (await sessionResponse.json()) as { user?: { email?: string } } | null

    expect(session?.user?.email).toBe('demo@example.com')

    await fetch('http://localhost/api/auth/sign-out', {
      method: 'POST',
    })

    const clearedSessionResponse = await fetch('http://localhost/api/auth/get-session')
    const clearedSession = (await clearedSessionResponse.json()) as unknown

    expect(clearedSession).toBeNull()
  })
})
