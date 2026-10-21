import { TestOrganization } from '@/test/organization'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { HttpResponse, http } from 'msw'
import type { PropsWithChildren, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useTickets } from '@/features/tickets/hooks/useTickets'
import type {
  CreateTicketCommentRequest,
  CreateTicketRequest,
  Ticket,
  TicketComments,
  TicketDetail,
  TicketHistory,
  UpdateTicketRequest,
} from '@/features/tickets/schemas/index'
import { TICKETS_SEARCH_DEFAULT } from '@/features/tickets/schemas/search'
import { server } from '@/mocks/server'
import { TICKET_ADMIN, TICKET_CREATOR, TICKET_EDITOR } from '@/test/fixtures/ticketActors'
import { useCreateTicket } from './useCreateTicket'
import { useCreateTicketComment } from './useCreateTicketComment'
import { useDeleteTicket } from './useDeleteTicket'
import { useDeleteTicketComment } from './useDeleteTicketComment'
import { useTicket } from './useTicket'
import { useUpdateTicket } from './useUpdateTicket'
import { useUpdateTicketComment } from './useUpdateTicketComment'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

const renderWithQueryClient = (ui: ReactNode) => {
  const queryClient = createTestQueryClient()
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}><TestOrganization>{children}</TestOrganization></QueryClientProvider>
  )

  return render(ui, { wrapper })
}

const createEmptyHistory = (): TicketHistory => ({ items: [] })
const createEmptyComments = (): TicketComments => ({ items: [] })

const toTicketSummary = ({
  comments: _comments,
  history: _history,
  ...ticket
}: TicketDetail): Ticket => ticket

const buildSeedTickets = (): TicketDetail[] => [
  {
    id: 1,
    title: 'Login bug',
    status: 'open',
    assignee: 'aki',
    createdBy: TICKET_CREATOR,
    updatedBy: TICKET_EDITOR,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-03T15:00:00Z',
    history: createEmptyHistory(),
    comments: {
      items: [
        {
          id: 101,
          body: 'Initial investigation started.',
          createdBy: TICKET_EDITOR,
          createdAt: '2026-03-03T15:00:00Z',
        },
      ],
    },
  },
  {
    id: 2,
    title: 'Refactor filters',
    status: 'closed',
    assignee: null,
    createdBy: TICKET_CREATOR,
    updatedBy: TICKET_CREATOR,
    createdAt: '2026-02-27T12:00:00Z',
    updatedAt: '2026-03-01T09:45:00Z',
    history: createEmptyHistory(),
    comments: createEmptyComments(),
  },
  {
    id: 3,
    title: 'Add pagination',
    status: 'open',
    assignee: 'mika',
    createdBy: TICKET_EDITOR,
    updatedBy: TICKET_ADMIN,
    createdAt: '2026-03-02T09:30:00Z',
    updatedAt: '2026-03-04T08:20:00Z',
    history: createEmptyHistory(),
    comments: createEmptyComments(),
  },
]

const createIntegrationHandlers = (tickets: TicketDetail[]) => [
  http.get(`*/api/tickets`, () => {
    const items = tickets.toSorted((a, b) => a.id - b.id)

    return HttpResponse.json({
      items: items.map(toTicketSummary),
      total: items.length,
    })
  }),
  http.get(`*/api/tickets/:id`, ({ params }) => {
    const id = Number(params.id)
    const ticket = tickets.find((item) => item.id === id)

    if (!ticket) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
    }

    return HttpResponse.json(ticket)
  }),
  http.post(`*/api/tickets`, async ({ request }) => {
    const body = (await request.json()) as CreateTicketRequest
    const ticket: TicketDetail = {
      id: tickets.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
      title: body.title,
      status: body.status,
      assignee: body.assignee ?? null,
      createdBy: TICKET_ADMIN,
      updatedBy: TICKET_ADMIN,
      createdAt: '2026-03-06T10:00:00Z',
      updatedAt: '2026-03-06T10:00:00Z',
      history: createEmptyHistory(),
      comments: createEmptyComments(),
    }

    tickets.push(ticket)

    return HttpResponse.json(ticket, { status: 201 })
  }),
  http.post(`*/api/tickets/:id/comments`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as CreateTicketCommentRequest
    const ticket = tickets.find((item) => item.id === id)

    if (!ticket) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
    }

    ticket.updatedBy = TICKET_ADMIN
    ticket.updatedAt = '2026-03-06T12:00:00Z'
    ticket.comments = {
      items: [
        {
          id: 102,
          body: body.body,
          createdBy: TICKET_ADMIN,
          createdAt: '2026-03-06T12:00:00Z',
        },
        ...ticket.comments.items,
      ],
    }

    return HttpResponse.json(ticket, { status: 201 })
  }),
  http.put(`*/api/tickets/:id/comments/:commentId`, async ({ params, request }) => {
    const id = Number(params.id)
    const commentId = Number(params.commentId)
    const body = (await request.json()) as CreateTicketCommentRequest
    const ticket = tickets.find((item) => item.id === id)

    if (!ticket) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
    }

    const comment = ticket.comments.items.find((item) => item.id === commentId)

    if (!comment) {
      return HttpResponse.json({ message: 'comment not found' }, { status: 404 })
    }

    comment.body = body.body
    ticket.updatedBy = TICKET_ADMIN
    ticket.updatedAt = '2026-03-06T12:30:00Z'

    return HttpResponse.json(ticket)
  }),
  http.delete(`*/api/tickets/:id/comments/:commentId`, ({ params }) => {
    const id = Number(params.id)
    const commentId = Number(params.commentId)
    const ticket = tickets.find((item) => item.id === id)

    if (!ticket) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
    }

    ticket.comments = {
      items: ticket.comments.items.filter((item) => item.id !== commentId),
    }
    ticket.updatedBy = TICKET_ADMIN
    ticket.updatedAt = '2026-03-06T13:00:00Z'

    return HttpResponse.json(ticket)
  }),
  http.put(`*/api/tickets/:id`, async ({ params, request }) => {
    const id = Number(params.id)
    const body = (await request.json()) as Omit<UpdateTicketRequest, 'id'>
    const ticket = tickets.find((item) => item.id === id)

    if (!ticket) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
    }

    const previousStatus = ticket.status
    ticket.title = body.title
    ticket.status = body.status
    ticket.assignee = body.assignee ?? null
    ticket.updatedBy = TICKET_ADMIN
    ticket.updatedAt = '2026-03-06T11:00:00Z'
    ticket.history = {
      items: [
        {
          operationId: 'mock-op-1',
          actor: TICKET_ADMIN,
          changedAt: '2026-03-06T11:00:00Z',
          changes: [
            {
              field: 'status',
              before: previousStatus,
              after: body.status,
            },
          ],
        },
      ],
    }

    return HttpResponse.json(ticket)
  }),
  http.delete(`*/api/tickets/:id`, ({ params }) => {
    const id = Number(params.id)
    const index = tickets.findIndex((item) => item.id === id)

    if (index < 0) {
      return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
    }

    tickets.splice(index, 1)

    return new HttpResponse(null, { status: 204 })
  }),
]

const listFilters = { ...TICKETS_SEARCH_DEFAULT, pageSize: 100 }

function TicketListProbe() {
  const { data, error, isPending, isError } = useTickets({ filters: listFilters })

  if (isPending) {
    return <p>loading-list</p>
  }

  if (isError || !data) {
    return <p>list-error:{error instanceof Error ? error.message : 'unknown'}</p>
  }

  return (
    <ul aria-label="ticket-list">
      {data.items.map((ticket) => (
        <li key={ticket.id}>
          {`${ticket.id}:${ticket.title}:${ticket.status}:${ticket.assignee ?? '-'}:${ticket.createdBy?.displayName ?? '-'}:${ticket.updatedBy?.displayName ?? '-'}`}
        </li>
      ))}
    </ul>
  )
}

function TicketDetailProbe({ id }: { id: number }) {
  const { data, error, isPending, isError } = useTicket({ id })

  if (isPending) {
    return <p>loading-detail</p>
  }

  if (isError || !data) {
    return <p>detail-error:{error instanceof Error ? error.message : 'unknown'}</p>
  }

  return (
    <p>
      {`${data.id}:${data.title}:${data.status}:${data.assignee ?? '-'}:${data.createdBy?.displayName ?? '-'}:${data.updatedBy?.displayName ?? '-'}:${data.comments.items[0]?.body ?? '-'}`}
    </p>
  )
}

function CreateTicketIntegrationProbe() {
  const mutation = useCreateTicket()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.mutate({
            title: 'Write docs',
            status: 'open',
            assignee: 'sora',
          })
        }}
      >
        create-ticket
      </button>
      <TicketListProbe />
    </>
  )
}

function UpdateTicketIntegrationProbe() {
  const mutation = useUpdateTicket()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.mutate({
            id: 1,
            title: 'Login bug resolved',
            status: 'closed',
            assignee: 'nao',
          })
        }}
      >
        update-ticket
      </button>
      <TicketDetailProbe id={1} />
    </>
  )
}

function DeleteTicketIntegrationProbe() {
  const mutation = useDeleteTicket()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.mutate(1)
        }}
      >
        delete-ticket
      </button>
      <TicketListProbe />
    </>
  )
}

function CreateTicketCommentIntegrationProbe() {
  const mutation = useCreateTicketComment()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.mutate({
            ticketId: 1,
            body: 'We are investigating this now.',
          })
        }}
      >
        create-ticket-comment
      </button>
      <TicketDetailProbe id={1} />
    </>
  )
}

function UpdateTicketCommentIntegrationProbe() {
  const mutation = useUpdateTicketComment()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.mutate({
            ticketId: 1,
            commentId: 101,
            body: 'Edited investigation update.',
          })
        }}
      >
        update-ticket-comment
      </button>
      <TicketDetailProbe id={1} />
    </>
  )
}

function DeleteTicketCommentIntegrationProbe() {
  const mutation = useDeleteTicketComment()

  return (
    <>
      <button
        type="button"
        onClick={() => {
          mutation.mutate({
            ticketId: 1,
            commentId: 101,
          })
        }}
      >
        delete-ticket-comment
      </button>
      <TicketDetailProbe id={1} />
    </>
  )
}

describe('ticket CRUD hooks', () => {
  beforeEach(() => {
    server.use(...createIntegrationHandlers(buildSeedTickets()))
  })

  afterEach(() => {
    cleanup()
  })

  it('useTicket fetches detail through api.ts and MSW', async () => {
    renderWithQueryClient(<TicketDetailProbe id={1} />)

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Editor User:Initial investigation started.',
    )
  })

  it('useCreateTicket updates the rendered ticket list after the server accepts creation', async () => {
    renderWithQueryClient(<CreateTicketIntegrationProbe />)

    await screen.findByText('1:Login bug:open:aki:Creator User:Editor User')
    fireEvent.click(screen.getByRole('button', { name: 'create-ticket' }))

    await screen.findByText('4:Write docs:open:sora:Admin User:Admin User')
  })

  it('useUpdateTicket keeps the rendered detail in sync after a successful update', async () => {
    renderWithQueryClient(<UpdateTicketIntegrationProbe />)

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Editor User:Initial investigation started.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'update-ticket' }))

    await screen.findByText(
      '1:Login bug resolved:closed:nao:Creator User:Admin User:Initial investigation started.',
    )
  })

  it('useCreateTicketComment keeps the rendered detail in sync after a successful comment', async () => {
    renderWithQueryClient(<CreateTicketCommentIntegrationProbe />)

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Editor User:Initial investigation started.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'create-ticket-comment' }))

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Admin User:We are investigating this now.',
    )
  })

  it('useUpdateTicketComment keeps the rendered detail in sync after a successful edit', async () => {
    renderWithQueryClient(<UpdateTicketCommentIntegrationProbe />)

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Editor User:Initial investigation started.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'update-ticket-comment' }))

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Admin User:Edited investigation update.',
    )
  })

  it('useDeleteTicketComment keeps the rendered detail in sync after a successful delete', async () => {
    renderWithQueryClient(<DeleteTicketCommentIntegrationProbe />)

    await screen.findByText(
      '1:Login bug:open:aki:Creator User:Editor User:Initial investigation started.',
    )
    fireEvent.click(screen.getByRole('button', { name: 'delete-ticket-comment' }))

    await screen.findByText('1:Login bug:open:aki:Creator User:Admin User:-')
  })

  it('useDeleteTicket removes the deleted row from the rendered ticket list', async () => {
    renderWithQueryClient(<DeleteTicketIntegrationProbe />)

    await screen.findByText('1:Login bug:open:aki:Creator User:Editor User')
    fireEvent.click(screen.getByRole('button', { name: 'delete-ticket' }))

    await waitFor(() => {
      expect(screen.queryByText('1:Login bug:open:aki:Creator User:Editor User')).toBeNull()
      expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(1)
    })
  })
})
