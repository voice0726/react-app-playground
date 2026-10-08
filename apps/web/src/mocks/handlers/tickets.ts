import { HttpResponse, http } from 'msw'
import {
  CreateTicketCommentRequest,
  type CreateTicketCommentRequest as CreateTicketCommentRequestType,
  CreateTicketRequest,
  type CreateTicketRequest as CreateTicketRequestType,
  type Ticket,
  type TicketActor,
  type TicketComment,
  type TicketComments,
  type TicketDetail,
  type TicketHistory,
  ticketActorSchema,
  UpdateTicketRequest,
  type UpdateTicketRequest as UpdateTicketRequestType,
} from '@/features/tickets/schemas/index'
import { type TicketsSearch, ticketsSearchSchema } from '@/features/tickets/schemas/search'

type MockTicket = TicketDetail
const createEmptyHistory = (): TicketHistory => ({ items: [] })
const createEmptyComments = (): TicketComments => ({ items: [] })
const ERROR_CODES: Record<number, string> = { 400: 'bad_request', 403: 'forbidden', 404: 'not_found' }

const ticketError = (status: number, message: string) =>
  HttpResponse.json({ error: { code: ERROR_CODES[status] ?? 'error', message } }, { status })

const invalidBody = () => ticketError(400, 'Invalid request body')

const readBody = async <T>(request: Request, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }) => {
  const result = schema.safeParse(await request.json().catch(() => null))

  return result.success ? result.data : null
}

const ReplaceTicketRequest = UpdateTicketRequest.omit({ id: true }).strict()

const MOCK_USER: TicketActor = ticketActorSchema.parse({
  id: '1',
  email: 'admin@example.com',
  displayName: 'Admin User',
})
const TICKET_CREATOR: TicketActor = ticketActorSchema.parse({
  id: '11',
  email: 'creator@example.com',
  displayName: 'Creator User',
})
const TICKET_EDITOR: TicketActor = ticketActorSchema.parse({
  id: '12',
  email: 'editor@example.com',
  displayName: 'Editor User',
})
const TICKET_ACTORS = [TICKET_CREATOR, TICKET_EDITOR, MOCK_USER]

const toTicketSummary = ({
  comments: _comments,
  history: _history,
  ...ticket
}: MockTicket): Ticket => ticket

const BASE_TICKETS: MockTicket[] = [
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
    updatedBy: MOCK_USER,
    createdAt: '2026-03-02T09:30:00Z',
    updatedAt: '2026-03-04T08:20:00Z',
    history: createEmptyHistory(),
    comments: createEmptyComments(),
  },
]

const ASSIGNEES = ['aki', 'mika', 'sora', 'nao'] as const

const GENERATED_TICKETS: MockTicket[] = Array.from({ length: 37 }, (_, index) => {
  const ticketNumber = index + 4
  const createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, 0) + index * 8 * 60 * 60 * 1000)
  const updatedAt = new Date(createdAt.getTime() + ((index % 6) + 1) * 3 * 60 * 60 * 1000)
  const titlePrefix = ['Bugfix', 'Feature', 'Refactor', 'Ops'][index % 4]

  return {
    id: ticketNumber,
    title: `${titlePrefix} task #${ticketNumber}`,
    status: index % 3 === 0 ? 'closed' : 'open',
    assignee: index % 5 === 0 ? null : ASSIGNEES[index % ASSIGNEES.length],
    // Intentionally rotate createdBy and updatedBy across TICKET_ACTORS using index
    // so mock data covers mixed-actor UI states; production createdBy/updatedBy may match.
    createdBy: TICKET_ACTORS[index % TICKET_ACTORS.length],
    updatedBy: TICKET_ACTORS[(index + 1) % TICKET_ACTORS.length],
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    history: createEmptyHistory(),
    comments: createEmptyComments(),
  }
})

const cloneTickets = (tickets: MockTicket[]) => tickets.map((ticket) => structuredClone(ticket))

const createTicketStore = () => [...cloneTickets(BASE_TICKETS), ...cloneTickets(GENERATED_TICKETS)]

let ticketsStore: MockTicket[] = createTicketStore()

export const resetTicketState = () => {
  ticketsStore = createTicketStore()
}

const sortFieldConfig: Record<TicketsSearch['sortBy'], 'id' | 'createdAt' | 'updatedAt'> = {
  id: 'id',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
}

export const listTickets = (tickets: MockTicket[], search: TicketsSearch) => {
  const filtered = tickets.filter((ticket) => {
    if (search.status !== 'all' && ticket.status !== search.status) {
      return false
    }

    if (search.q && !ticket.title.toLowerCase().includes(search.q.toLowerCase())) {
      return false
    }

    return true
  })

  const field = sortFieldConfig[search.sortBy]
  const sorted = filtered.toSorted((a, b) => {
    const diff = field === 'id' ? a.id - b.id : Date.parse(a[field]) - Date.parse(b[field])
    return search.sortOrder === 'asc' ? diff : -diff
  })

  const total = sorted.length
  const start = (search.page - 1) * search.pageSize
  const end = start + search.pageSize

  return {
    items: sorted.slice(start, end).map(toTicketSummary),
    total,
  }
}

export const getTicketById = (tickets: MockTicket[], id: Ticket['id']) =>
  tickets.find((ticket) => ticket.id === id)

export const createTicketItem = (
  tickets: MockTicket[],
  input: CreateTicketRequestType,
  now: string,
  actor: TicketActor = MOCK_USER,
): MockTicket => {
  const nextId = tickets.reduce((maxId, ticket) => Math.max(maxId, ticket.id), 0) + 1
  const ticket: MockTicket = {
    id: nextId,
    title: input.title,
    status: input.status,
    assignee: input.assignee ?? null,
    createdBy: actor,
    updatedBy: actor,
    createdAt: now,
    updatedAt: now,
    history: createEmptyHistory(),
    comments: createEmptyComments(),
  }

  tickets.unshift(ticket)

  return ticket
}

export const updateTicketItem = (
  tickets: MockTicket[],
  input: UpdateTicketRequestType,
  now: string,
  actor: TicketActor = MOCK_USER,
): MockTicket | null => {
  const ticket = tickets.find((item) => item.id === input.id)

  if (!ticket) {
    return null
  }

  const previousStatus = ticket.status
  ticket.title = input.title
  ticket.status = input.status
  ticket.assignee = input.assignee ?? null
  ticket.updatedBy = actor
  ticket.updatedAt = now
  const history = ticket.history ?? createEmptyHistory()
  ticket.history = history

  if (previousStatus !== input.status) {
    history.items.unshift({
      operationId: `mock-op-${ticket.id}-${Date.parse(now)}`,
      actor,
      changedAt: now,
      changes: [
        {
          field: 'status',
          before: previousStatus,
          after: input.status,
        },
      ],
    })
  }

  return ticket
}

export const deleteTicketItem = (tickets: MockTicket[], id: Ticket['id']) => {
  const index = tickets.findIndex((ticket) => ticket.id === id)

  if (index < 0) {
    return null
  }

  const [removedTicket] = tickets.splice(index, 1)

  return removedTicket
}

export const createTicketCommentItem = (
  tickets: MockTicket[],
  ticketId: Ticket['id'],
  input: CreateTicketCommentRequestType,
  now: string,
  actor: TicketActor = MOCK_USER,
): MockTicket | null => {
  const ticket = tickets.find((item) => item.id === ticketId)

  if (!ticket) {
    return null
  }

  const nextCommentId =
    tickets
      .flatMap((item) => item.comments.items)
      .reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1
  const comment: TicketComment = {
    id: nextCommentId,
    body: input.body,
    createdBy: actor,
    createdAt: now,
  }

  ticket.comments.items.unshift(comment)
  ticket.updatedBy = actor
  ticket.updatedAt = now

  return ticket
}

export const updateTicketCommentItem = (
  tickets: MockTicket[],
  ticketId: Ticket['id'],
  commentId: number,
  input: CreateTicketCommentRequestType,
  now: string,
  actor: TicketActor = MOCK_USER,
): MockTicket | null => {
  const ticket = tickets.find((item) => item.id === ticketId)

  if (!ticket) {
    return null
  }

  const comment = ticket.comments.items.find((item) => item.id === commentId)

  if (!comment) {
    return null
  }

  comment.body = input.body
  ticket.updatedBy = actor
  ticket.updatedAt = now

  return ticket
}

export const deleteTicketCommentItem = (
  tickets: MockTicket[],
  ticketId: Ticket['id'],
  commentId: number,
  now: string,
  actor: TicketActor = MOCK_USER,
): MockTicket | null => {
  const ticket = tickets.find((item) => item.id === ticketId)

  if (!ticket) {
    return null
  }

  const nextItems = ticket.comments.items.filter((item) => item.id !== commentId)

  if (nextItems.length === ticket.comments.items.length) {
    return null
  }

  ticket.comments.items = nextItems
  ticket.updatedBy = actor
  ticket.updatedAt = now

  return ticket
}

const parseTicketId = (value: string | readonly string[] | undefined) => {
  if (Array.isArray(value)) {
    return null
  }

  const id = Number(value)

  return Number.isInteger(id) && id > 0 ? id : null
}

export const ticketHandlers = [
  http.get('*/api/tickets', async ({ request }) => {
    const url = new URL(request.url)
    const search = ticketsSearchSchema.parse(Object.fromEntries(url.searchParams.entries()))
    const result = listTickets(ticketsStore, search)

    return HttpResponse.json(result)
  }),
  http.get('*/api/tickets/:id', async ({ params }) => {
    const id = parseTicketId(params.id)

    if (id === null) {
      return ticketError(400, 'Invalid ticket id')
    }

    const ticket = getTicketById(ticketsStore, id)

    if (!ticket) {
      return ticketError(404, 'Ticket not found')
    }

    return HttpResponse.json(ticket)
  }),
  http.post('*/api/tickets', async ({ request }) => {
    const body = await readBody(request, CreateTicketRequest)

    if (body === null) {
      return invalidBody()
    }

    const now = new Date().toISOString()
    const actor = ticketActorSchema.parse(MOCK_USER)
    const ticket = createTicketItem(ticketsStore, body, now, actor)

    return HttpResponse.json(ticket, { status: 201 })
  }),
  http.post('*/api/tickets/:id/comments', async ({ params, request }) => {
    const id = parseTicketId(params.id)

    if (id === null) {
      return ticketError(400, 'Invalid ticket id')
    }

    const body = await readBody(request, CreateTicketCommentRequest)

    if (body === null) {
      return invalidBody()
    }

    const actor = ticketActorSchema.parse(MOCK_USER)
    const ticket = createTicketCommentItem(ticketsStore, id, body, new Date().toISOString(), actor)

    if (!ticket) {
      return ticketError(404, 'Ticket not found')
    }

    return HttpResponse.json(ticket, { status: 201 })
  }),
  http.put('*/api/tickets/:id/comments/:commentId', async ({ params, request }) => {
    const ticketId = parseTicketId(params.id)
    const commentId = parseTicketId(params.commentId)

    if (ticketId === null || commentId === null) {
      return ticketError(400, 'Invalid comment id')
    }

    const body = await readBody(request, CreateTicketCommentRequest)

    if (body === null) {
      return invalidBody()
    }

    const actor = ticketActorSchema.parse(MOCK_USER)
    const ticket = getTicketById(ticketsStore, ticketId)

    if (!ticket) {
      return ticketError(404, 'Ticket not found')
    }

    const comment = ticket.comments.items.find((item) => item.id === commentId)

    if (!comment) {
      return ticketError(404, 'comment not found')
    }

    if (comment.createdBy?.id !== actor.id) {
      return ticketError(403, 'comment can only be modified by its author')
    }

    const updated = updateTicketCommentItem(
      ticketsStore,
      ticketId,
      commentId,
      body,
      new Date().toISOString(),
      actor,
    )

    return HttpResponse.json(updated)
  }),
  http.delete('*/api/tickets/:id/comments/:commentId', async ({ params }) => {
    const ticketId = parseTicketId(params.id)
    const commentId = parseTicketId(params.commentId)

    if (ticketId === null || commentId === null) {
      return ticketError(400, 'Invalid comment id')
    }

    const actor = ticketActorSchema.parse(MOCK_USER)
    const ticket = getTicketById(ticketsStore, ticketId)

    if (!ticket) {
      return ticketError(404, 'Ticket not found')
    }

    const comment = ticket.comments.items.find((item) => item.id === commentId)

    if (!comment) {
      return ticketError(404, 'comment not found')
    }

    if (comment.createdBy?.id !== actor.id) {
      return ticketError(403, 'comment can only be modified by its author')
    }

    const updated = deleteTicketCommentItem(
      ticketsStore,
      ticketId,
      commentId,
      new Date().toISOString(),
      actor,
    )

    return HttpResponse.json(updated)
  }),
  http.put('*/api/tickets/:id', async ({ params, request }) => {
    const id = parseTicketId(params.id)

    if (id === null) {
      return ticketError(400, 'Invalid ticket id')
    }

    const input = await readBody(request, ReplaceTicketRequest)

    if (input === null) {
      return invalidBody()
    }

    const body = { ...input, id }

    const actor = ticketActorSchema.parse(MOCK_USER)
    const ticket = updateTicketItem(ticketsStore, body, new Date().toISOString(), actor)

    if (!ticket) {
      return ticketError(404, 'Ticket not found')
    }

    return HttpResponse.json(ticket)
  }),
  http.delete('*/api/tickets/:id', async ({ params }) => {
    const id = parseTicketId(params.id)

    if (id === null) {
      return ticketError(400, 'Invalid ticket id')
    }

    const removedTicket = deleteTicketItem(ticketsStore, id)

    if (!removedTicket) {
      return ticketError(404, 'Ticket not found')
    }

    return new HttpResponse(null, { status: 204 })
  }),
]
