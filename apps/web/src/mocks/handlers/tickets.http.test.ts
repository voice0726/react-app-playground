import { describe, expect, it } from 'vitest'

const send = (method: string, path: string, body?: string) =>
  fetch(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json' },
    body,
  })

const expectInvalidBody = async (response: Response) => {
  expect(response.status).toBe(400)
  expect(await response.json()).toEqual({
    error: { code: 'bad_request', message: 'Invalid request body' },
  })
}

describe('ticket mock handlers: invalid input', () => {
  it.each([
    ['POST', '/api/tickets', '{'],
    ['POST', '/api/tickets', JSON.stringify({ title: '  ', status: 'open' })],
    ['POST', '/api/tickets/1/comments', JSON.stringify({ body: ' ' })],
    ['PUT', '/api/tickets/1/comments/101', '{'],
    ['PUT', '/api/tickets/1', JSON.stringify({ title: '', status: 'open', assignee: null })],
  ])('returns 400 with the error envelope for %s %s', async (method, path, body) => {
    await expectInvalidBody(await send(method, path, body))
  })

  it('rejects an id in the PUT body like the backend', async () => {
    const response = await send(
      'PUT',
      '/api/tickets/1',
      JSON.stringify({ id: 1, title: 'x', status: 'open', assignee: null }),
    )

    await expectInvalidBody(response)
  })

  it('updates a ticket from a body without id', async () => {
    const response = await send(
      'PUT',
      '/api/tickets/1',
      JSON.stringify({ title: 'Renamed', status: 'closed', assignee: null }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ id: 1, title: 'Renamed', status: 'closed' })
  })
})
