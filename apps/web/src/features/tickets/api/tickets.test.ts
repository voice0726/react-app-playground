import { testOrganization } from '@/test/organization'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createTicket,
  createTicketComment,
  deleteTicket,
  deleteTicketComment,
  fetchTicket,
  fetchTickets,
  updateTicket,
  updateTicketComment,
} from '@/features/tickets/api/tickets'
import { ApiContractError, NetworkError } from '@/lib/http'

const summary = {
  id: 1,
  title: 'Login bug',
  status: 'open' as const,
  assignee: null,
  createdAt: '2026-03-01T10:00:00Z',
  updatedAt: '2026-03-03T15:00:00Z',
}
const detail = {
  ...summary,
  history: { items: [] },
  comments: { items: [] },
}
const response = (body: unknown, status = 200) => Response.json(body, { status })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ticket API', () => {
  it('fetches a filtered ticket list', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ items: [summary], total: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchTickets({
        q: 'bug',
        status: 'open',
        sortBy: 'id',
        sortOrder: 'asc',
        page: 2,
        pageSize: 10,
      }, testOrganization.id),
    ).resolves.toEqual({ items: [summary], total: 1 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/tickets?q=bug&status=open&sortBy=id&sortOrder=asc&page=2&pageSize=10',
    )
  })

  it('classifies network failures with the ticket endpoint', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      fetchTickets({
        q: undefined,
        status: 'all',
        sortBy: 'id',
        sortOrder: 'asc',
        page: 1,
        pageSize: 10,
      }, testOrganization.id),
    ).rejects.toMatchObject({
      name: 'NetworkError',
      endpoint: '/api/tickets?status=all&sortBy=id&sortOrder=asc&page=1&pageSize=10',
    } satisfies Partial<NetworkError>)
  })

  it('classifies malformed and schema-invalid ticket responses', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response('{invalid', { headers: { 'content-type': 'application/json' } }),
      )
      .mockResolvedValueOnce(response({ items: [summary] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTicket(1, testOrganization.id)).rejects.toMatchObject({
      endpoint: '/api/tickets/1',
    } satisfies Partial<ApiContractError>)
    await expect(
      fetchTickets({
        q: undefined,
        status: 'all',
        sortBy: 'id',
        sortOrder: 'asc',
        page: 1,
        pageSize: 10,
      }, testOrganization.id),
    ).rejects.toBeInstanceOf(ApiContractError)
  })

  it('rejects invalid ids before making a request', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTicket(0, testOrganization.id)).rejects.toThrow(/expected number to be >0/)
    await expect(deleteTicket(1.5, testOrganization.id)).rejects.toThrow(/expected int/)
    await expect(createTicketComment({ ticketId: Number.NaN, body: 'Comment' }, testOrganization.id)).rejects.toThrow(
      /expected number/,
    )
    await expect(
      updateTicketComment({ ticketId: 0, commentId: 1, body: 'Comment' }, testOrganization.id),
    ).rejects.toThrow(/expected number to be >0/)
    await expect(
      updateTicketComment({ ticketId: 1, commentId: 0, body: 'Comment' }, testOrganization.id),
    ).rejects.toThrow(/expected number to be >0/)
    await expect(deleteTicketComment({ ticketId: -1, commentId: 1 }, testOrganization.id)).rejects.toThrow(
      /expected number to be >0/,
    )
    await expect(deleteTicketComment({ ticketId: 1, commentId: -1 }, testOrganization.id)).rejects.toThrow(
      /expected number to be >0/,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('fetches a ticket detail', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response(detail))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchTicket(1, testOrganization.id)).resolves.toEqual(detail)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/tickets/1')
  })

  it('creates and updates tickets with schema-shaped JSON bodies', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(detail, 201))
      .mockResolvedValueOnce(response(detail))
    vi.stubGlobal('fetch', fetchMock)

    await createTicket({ title: 'New ticket', status: 'open', assignee: null }, testOrganization.id)
    await updateTicket({ id: 1, title: 'Updated ticket', status: 'closed', assignee: null }, testOrganization.id)

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ title: 'New ticket', status: 'open', assignee: null }),
    })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/tickets/1')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ title: 'Updated ticket', status: 'closed', assignee: null }),
    })
  })

  it('deletes a ticket without parsing a response body', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteTicket(1, testOrganization.id)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'DELETE',
      credentials: 'include',
    })
  })

  it('maps comment create, update, and delete endpoints', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response(detail, 201))
      .mockResolvedValueOnce(response(detail))
      .mockResolvedValueOnce(response(detail))
    vi.stubGlobal('fetch', fetchMock)

    await createTicketComment({ ticketId: 1, body: 'New comment' }, testOrganization.id)
    await updateTicketComment({ ticketId: 1, commentId: 2, body: 'Updated comment' }, testOrganization.id)
    await deleteTicketComment({ ticketId: 1, commentId: 2 }, testOrganization.id)

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/tickets/1/comments',
      '/api/tickets/1/comments/2',
      '/api/tickets/1/comments/2',
    ])
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ body: 'New comment' }),
    })
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'PUT',
      body: JSON.stringify({ body: 'Updated comment' }),
    })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'DELETE' })
  })
})
