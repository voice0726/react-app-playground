import { describe, expect, it } from 'vitest'
import {
  CreateTicketCommentRequest,
  CreateTicketRequest,
  ticketDetailSchema,
  ticketsResponseSchema,
} from './index'
import { ticketCommentFormValuesSchema, ticketFormValuesSchema } from './form'

describe('ticket response schema', () => {
  it.each([0, -1, 1.5])('rejects invalid ticket id %s', (id) => {
    expect(() =>
      ticketsResponseSchema.parse({
        items: [
          {
            id,
            title: 'Invalid ticket',
            status: 'open',
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-03T15:00:00Z',
          },
        ],
        total: 1,
      }),
    ).toThrow(/expected (number to be >0|int)/)
  })
})

describe('ticket actor schema compatibility', () => {
  it('accepts null and omitted createdBy/updatedBy in ticket summaries', () => {
    expect(() =>
      ticketsResponseSchema.parse({
        items: [
          {
            id: 1,
            title: 'Login bug',
            status: 'open',
            assignee: null,
            createdBy: null,
            updatedBy: null,
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-03T15:00:00Z',
          },
          {
            id: 2,
            title: 'Refactor filters',
            status: 'closed',
            assignee: 'mika',
            createdAt: '2026-03-02T10:00:00Z',
            updatedAt: '2026-03-04T15:00:00Z',
          },
        ],
        total: 2,
      }),
    ).not.toThrow()
  })

  it('accepts null and omitted actor in ticket history items', () => {
    expect(() =>
      ticketDetailSchema.parse({
        id: 1,
        title: 'Login bug',
        status: 'open',
        assignee: 'aki',
        createdBy: null,
        updatedBy: null,
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-03T15:00:00Z',
        history: {
          items: [
            {
              operationId: 'op-1',
              actor: null,
              changedAt: '2026-03-03T15:00:00Z',
              changes: [
                {
                  field: 'status',
                  before: 'closed',
                  after: 'open',
                },
              ],
            },
            {
              operationId: 'op-2',
              changedAt: '2026-03-04T15:00:00Z',
              changes: [
                {
                  field: 'assignee',
                  before: null,
                  after: 'mika',
                },
              ],
            },
          ],
        },
        comments: {
          items: [],
        },
      }),
    ).not.toThrow()
  })
})

describe('ticket input schema normalization', () => {
  it('normalizes title and assignee consistently for form and API requests', () => {
    const input = { title: '  Login bug  ', status: 'open' as const, assignee: '  ' }

    expect(ticketFormValuesSchema.parse(input)).toEqual({
      title: 'Login bug',
      status: 'open',
      assignee: null,
    })
    expect(CreateTicketRequest.parse(input)).toEqual({
      title: 'Login bug',
      status: 'open',
      assignee: null,
    })
  })

  it('rejects whitespace-only titles and comment bodies in form and API paths', () => {
    expect(() => ticketFormValuesSchema.parse({ title: '  ', status: 'open', assignee: '' })).toThrow(
      'タイトルは必須です',
    )
    expect(() => CreateTicketRequest.parse({ title: '  ', status: 'open', assignee: null })).toThrow(
      'タイトルは必須です',
    )
    expect(() => ticketCommentFormValuesSchema.parse({ body: '  ' })).toThrow('コメントは必須です')
    expect(() => CreateTicketCommentRequest.parse({ body: '  ' })).toThrow('コメントは必須です')
  })

  it('normalizes comment bodies consistently for form and API requests', () => {
    expect(ticketCommentFormValuesSchema.parse({ body: '  Looks good  ' })).toEqual({
      body: 'Looks good',
    })
    expect(CreateTicketCommentRequest.parse({ body: '  Looks good  ' })).toEqual({
      body: 'Looks good',
    })
  })
})
