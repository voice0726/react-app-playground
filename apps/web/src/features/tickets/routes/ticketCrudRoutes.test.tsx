import { notifications } from '@mantine/notifications'
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { delay, HttpResponse, http } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CreateTicketCommentRequest,
  type CreateTicketRequest,
  type TicketComments,
  type TicketHistory,
  type UpdateTicketRequest,
} from '@/features/tickets/schemas/index'
import { ticketsSearchSchema } from '@/features/tickets/schemas/search'
import {
  createTicketCommentItem,
  createTicketItem,
  deleteTicketCommentItem,
  deleteTicketItem,
  getTicketById,
  listTickets,
  updateTicketCommentItem,
  updateTicketItem,
} from '@/mocks/handlers/tickets'
import { server } from '@/mocks/server'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
import { routeTree } from '@/routeTree.gen'
import { TICKET_ADMIN, TICKET_CREATOR, TICKET_EDITOR } from '@/test/fixtures/ticketActors'

type MockTicket = Parameters<typeof listTickets>[0][number]
const AUTH_USER = TICKET_ADMIN

const createEmptyHistory = (): TicketHistory => ({ items: [] })
const createEmptyComments = (): TicketComments => ({ items: [] })
const parseTicketId = (value: string | readonly string[] | undefined) => {
  if (Array.isArray(value)) {
    return null
  }

  const id = Number(value)

  return Number.isInteger(id) && id > 0 ? id : null
}
const parseCommentId = parseTicketId

const buildSeedTickets = (): MockTicket[] => [
  {
    id: 1,
    title: 'Login bug',
    status: 'open',
    assignee: 'aki',
    createdBy: TICKET_CREATOR,
    updatedBy: TICKET_EDITOR,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-03T15:00:00Z',
    history: {
      items: [
        {
          operationId: 'seed-op-1',
          actor: TICKET_EDITOR,
          changedAt: '2026-03-03T15:00:00Z',
          changes: [
            {
              field: 'status',
              before: 'closed',
              after: 'open',
            },
          ],
        },
      ],
    },
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

const createUiHandlers = (tickets: MockTicket[]) => {
  const currentUser = AUTH_USER

  return [
    http.get(`*/api/tickets`, ({ request }) => {
      const url = new URL(request.url)
      const search = ticketsSearchSchema.parse(Object.fromEntries(url.searchParams.entries()))

      return HttpResponse.json(listTickets(tickets, search))
    }),
    http.get(`*/api/tickets/:id`, ({ params }) => {
      const ticket = getTicketById(tickets, Number(params.id))

      if (!ticket) {
        return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
      }

      return HttpResponse.json(ticket)
    }),
    http.post(`*/api/tickets`, async ({ request }) => {
      const body = (await request.json()) as CreateTicketRequest
      const ticket = createTicketItem(tickets, body, '2026-03-06T10:00:00Z')

      return HttpResponse.json(ticket, { status: 201 })
    }),
    http.post(`*/api/tickets/:id/comments`, async ({ params, request }) => {
      const id = parseTicketId(params.id)

      if (id === null) {
        return HttpResponse.json({ message: 'Invalid ticket id' }, { status: 400 })
      }

      let body: CreateTicketCommentRequest

      try {
        body = CreateTicketCommentRequest.parse(await request.json())
      } catch {
        return HttpResponse.json({ message: 'Invalid request body' }, { status: 400 })
      }

      const ticket = createTicketCommentItem(
        tickets,
        id,
        body,
        '2026-03-06T12:00:00Z',
        TICKET_ADMIN,
      )

      if (!ticket) {
        return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
      }

      return HttpResponse.json(ticket, { status: 201 })
    }),
    http.put(`*/api/tickets/:id/comments/:commentId`, async ({ params, request }) => {
      const ticketId = parseTicketId(params.id)
      const commentId = parseCommentId(params.commentId)

      if (ticketId === null || commentId === null) {
        return HttpResponse.json({ message: 'Invalid comment id' }, { status: 400 })
      }

      let body: CreateTicketCommentRequest

      try {
        body = CreateTicketCommentRequest.parse(await request.json())
      } catch {
        return HttpResponse.json({ message: 'Invalid request body' }, { status: 400 })
      }

      const ticket = getTicketById(tickets, ticketId)

      if (!ticket) {
        return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
      }

      const comment = ticket.comments.items.find((item) => item.id === commentId)

      if (!comment) {
        return HttpResponse.json({ message: 'comment not found' }, { status: 404 })
      }

      if (comment.createdBy?.id !== currentUser.id) {
        return HttpResponse.json(
          { message: 'comment can only be modified by its author' },
          { status: 403 },
        )
      }

      return HttpResponse.json(
        updateTicketCommentItem(tickets, ticketId, commentId, body, '2026-03-06T12:30:00Z'),
      )
    }),
    http.delete(`*/api/tickets/:id/comments/:commentId`, ({ params }) => {
      const ticketId = parseTicketId(params.id)
      const commentId = parseCommentId(params.commentId)

      if (ticketId === null || commentId === null) {
        return HttpResponse.json({ message: 'Invalid comment id' }, { status: 400 })
      }

      const ticket = getTicketById(tickets, ticketId)

      if (!ticket) {
        return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
      }

      const comment = ticket.comments.items.find((item) => item.id === commentId)

      if (!comment) {
        return HttpResponse.json({ message: 'comment not found' }, { status: 404 })
      }

      if (comment.createdBy?.id !== currentUser.id) {
        return HttpResponse.json(
          { message: 'comment can only be modified by its author' },
          { status: 403 },
        )
      }

      return HttpResponse.json(
        deleteTicketCommentItem(tickets, ticketId, commentId, '2026-03-06T13:00:00Z'),
      )
    }),
    http.put(`*/api/tickets/:id`, async ({ params, request }) => {
      const body = (await request.json()) as Omit<UpdateTicketRequest, 'id'>
      const ticket = updateTicketItem(tickets, { ...body, id: Number(params.id) }, '2026-03-06T11:00:00Z')

      if (!ticket || ticket.id !== Number(params.id)) {
        return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
      }

      return HttpResponse.json(ticket)
    }),
    http.delete(`*/api/tickets/:id`, ({ params }) => {
      const ticket = deleteTicketItem(tickets, Number(params.id))

      if (!ticket) {
        return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
      }

      return new HttpResponse(null, { status: 204 })
    }),
  ]
}

const renderRoute = (initialEntry: string) => {
  const history = createMemoryHistory({
    initialEntries: [initialEntry],
  })
  const router = createRouter({ routeTree, history })

  render(<RouterProvider router={router} />)

  return { router }
}

describe('ticket CRUD routes', () => {
  beforeEach(() => {
    queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
    useSessionStore
      .getState()
      .setSession({ id: AUTH_USER.id, name: AUTH_USER.displayName, email: AUTH_USER.email })
    server.use(...createUiHandlers(buildSeedTickets()))
  })

  afterEach(() => {
    notifications.clean()
    cleanup()
    useSessionStore.getState().clearSession()
  })

  it('keeps search params when moving between list and detail pages', async () => {
    const { router } = renderRoute(
      '/tickets?q=Login&status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10',
    )

    await screen.findByText('Login bug')
    fireEvent.click(await screen.findByRole('button', { name: '詳細' }))

    await screen.findByText('チケット #1')
    fireEvent.click(screen.getAllByRole('button', { name: '一覧に戻る' })[0] as HTMLElement)

    await screen.findByDisplayValue('Login')
    expect(router.state.location.search).toMatchObject({
      q: 'Login',
      status: 'open',
    })
  })

  it('keeps the previous page rows visible while the next page is fetching', async () => {
    const tickets = buildSeedTickets()

    server.use(
      http.get(`*/api/tickets`, async ({ request }) => {
        const url = new URL(request.url)
        const search = ticketsSearchSchema.parse(Object.fromEntries(url.searchParams.entries()))

        if (search.page === 2) {
          await delay(200)
        }

        return HttpResponse.json(listTickets(tickets, search))
      }),
    )

    renderRoute('/tickets?status=all&sortBy=id&sortOrder=asc&page=1&pageSize=1')

    await screen.findByText('Login bug')
    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await screen.findByRole('status', { name: '更新中' })
    expect(screen.getByText('Login bug')).toBeTruthy()

    await screen.findByText('Refactor filters')
    await waitFor(() => {
      expect(screen.queryByText('Login bug')).toBeNull()
    })
  })

  it('does not show the empty state while the initial page load is still pending', async () => {
    const tickets = buildSeedTickets()

    server.use(
      http.get(`*/api/tickets`, async ({ request }) => {
        const url = new URL(request.url)
        const search = ticketsSearchSchema.parse(Object.fromEntries(url.searchParams.entries()))

        if (search.page === 2) {
          await delay(200)
        }

        return HttpResponse.json(listTickets(tickets, search))
      }),
    )

    renderRoute('/tickets?status=all&sortBy=id&sortOrder=asc&page=2&pageSize=1')

    await screen.findByRole('status', { name: '読み込み中' })
    expect(screen.queryByText('表示できるチケットがありません')).toBeNull()

    await screen.findByText('Refactor filters')
  })

  it('shows the table error state when the next page fetch fails', async () => {
    const tickets = buildSeedTickets()
    let pageTwoRequestCount = 0

    server.use(
      http.get(`*/api/tickets`, async ({ request }) => {
        const url = new URL(request.url)
        const search = ticketsSearchSchema.parse(Object.fromEntries(url.searchParams.entries()))

        if (search.page === 2 && pageTwoRequestCount++ === 0) {
          await delay(200)
          return HttpResponse.json({ message: 'fetch failed' }, { status: 500 })
        }

        return HttpResponse.json(listTickets(tickets, search))
      }),
    )

    renderRoute('/tickets?status=all&sortBy=id&sortOrder=asc&page=1&pageSize=1')

    await screen.findByText('Login bug')
    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await screen.findByRole('status', { name: '更新中' })
    await within(screen.getByRole('table')).findByText('チケット一覧の取得に失敗しました')
    expect(screen.queryByText('Login bug')).toBeNull()
    expect(screen.getByText('total: 3')).toBeTruthy()
    expect(screen.getByText('- / 3')).toBeTruthy()
    expect(screen.getByRole('button', { name: '3' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))
    await screen.findByText('Refactor filters')
    expect(screen.queryByText('チケット一覧の取得に失敗しました')).toBeNull()
  })

  it('shows operation history on the detail page', async () => {
    renderRoute('/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('操作履歴')
    expect(screen.getByText('コメント')).toBeTruthy()
    expect(screen.getByText('Initial investigation started.')).toBeTruthy()
    expect(screen.getByText('Creator User')).toBeTruthy()
    expect(screen.getByText('creator@example.com')).toBeTruthy()
    expect(screen.getAllByText('Editor User').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('ステータス')).toBeTruthy()
    expect(screen.getAllByText('Open')).toHaveLength(2)
    expect(screen.getByText('Closed')).toBeTruthy()
  })

  it('creates a comment on the detail page and shows it first', async () => {
    renderRoute('/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('Initial investigation started.')
    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'We are investigating this now.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '投稿する' }))

    await screen.findByText('コメントを投稿しました')
    await screen.findByText('We are investigating this now.')
    const comments = screen.getAllByText(
      /^(We are investigating this now\.|Initial investigation started\.)$/,
    )
    expect(comments.map((comment) => comment.textContent)).toEqual([
      'We are investigating this now.',
      'Initial investigation started.',
    ])
  })

  it('edits an authored comment on the detail page', async () => {
    renderRoute('/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('Initial investigation started.')
    expect(screen.queryByRole('button', { name: 'コメント 101 を編集' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'コメント 101 を削除' })).toBeNull()

    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'We are investigating this now.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '投稿する' }))

    await screen.findByText('We are investigating this now.')
    fireEvent.click(screen.getByRole('button', { name: 'コメント 102 を編集' }))
    const editButton = screen.getByRole('button', { name: 'コメント 102 を編集' })
    expect((editButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('コメントを編集'), {
      target: { value: 'Draft update that should be preserved.' },
    })
    fireEvent.click(editButton)
    expect((screen.getByLabelText('コメントを編集') as HTMLInputElement).value).toBe(
      'Draft update that should be preserved.',
    )
    fireEvent.change(screen.getByLabelText('コメントを編集'), {
      target: { value: 'Investigation has been completed.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '更新する' }))

    await screen.findByText('コメントを更新しました')
    await screen.findByText('Investigation has been completed.')
    expect(screen.queryByText('We are investigating this now.')).toBeNull()
  })

  it('does not allow switching to another comment edit while a draft is open', async () => {
    renderRoute('/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('Initial investigation started.')
    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'First authored comment.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '投稿する' }))

    await screen.findByText('First authored comment.')
    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'Second authored comment.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '投稿する' }))

    await screen.findByText('Second authored comment.')
    fireEvent.click(screen.getByRole('button', { name: 'コメント 103 を編集' }))
    fireEvent.change(screen.getByLabelText('コメントを編集'), {
      target: { value: 'Draft for first authored comment.' },
    })

    const secondEditButton = screen.getByRole('button', { name: 'コメント 102 を編集' })
    expect((secondEditButton as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(secondEditButton)

    expect((screen.getByLabelText('コメントを編集') as HTMLInputElement).value).toBe(
      'Draft for first authored comment.',
    )
    expect(screen.queryByDisplayValue('First authored comment.')).toBeNull()
  })

  it('deletes an authored comment on the detail page', async () => {
    renderRoute('/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('Initial investigation started.')
    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'We are investigating this now.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '投稿する' }))

    await screen.findByText('We are investigating this now.')
    fireEvent.click(screen.getByRole('button', { name: 'コメント 102 を削除' }))
    const dialog = await screen.findByRole('dialog', { name: 'コメントを削除' })
    expect(
      within(dialog).getByText('この操作は取り消せません。削除対象を確認してください。'),
    ).toBeTruthy()
    expect(within(dialog).getByText('We are investigating this now.')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: '削除する' }))

    await screen.findByText('コメントを削除しました')
    await waitFor(() => {
      expect(screen.queryByText('We are investigating this now.')).toBeNull()
    })
    expect(screen.getByText('Initial investigation started.')).toBeTruthy()
  })

  it('allows retrying a failed comment deletion for the same comment', async () => {
    const tickets = buildSeedTickets()
    let deleteAttempts = 0

    server.use(...createUiHandlers(tickets))
    server.use(
      http.delete(`*/api/tickets/:id/comments/:commentId`, ({ params }) => {
        const ticketId = parseTicketId(params.id)
        const commentId = parseCommentId(params.commentId)

        if (ticketId === null || commentId === null) {
          return HttpResponse.json({ message: 'Invalid comment id' }, { status: 400 })
        }

        const ticket = getTicketById(tickets, ticketId)

        if (!ticket) {
          return HttpResponse.json({ message: 'Ticket not found' }, { status: 404 })
        }

        const comment = ticket.comments.items.find((item) => item.id === commentId)

        if (!comment) {
          return HttpResponse.json({ message: 'comment not found' }, { status: 404 })
        }

        if (comment.createdBy?.id !== AUTH_USER.id) {
          return HttpResponse.json(
            { message: 'comment can only be modified by its author' },
            { status: 403 },
          )
        }

        deleteAttempts += 1

        if (deleteAttempts === 1) {
          return HttpResponse.json({ message: 'temporary delete failure' }, { status: 500 })
        }

        return HttpResponse.json(
          deleteTicketCommentItem(tickets, ticketId, commentId, '2026-03-06T13:00:00Z'),
        )
      }),
    )

    renderRoute('/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('Initial investigation started.')
    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'We are investigating this now.' },
    })
    fireEvent.click(screen.getByRole('button', { name: '投稿する' }))

    await screen.findByText('We are investigating this now.')
    fireEvent.click(screen.getByRole('button', { name: 'コメント 102 を削除' }))
    const firstDialog = await screen.findByRole('dialog', { name: 'コメントを削除' })
    fireEvent.click(within(firstDialog).getByRole('button', { name: '削除する' }))

    await screen.findByText('コメントの削除に失敗しました')
    fireEvent.click(within(firstDialog).getByRole('button', { name: 'キャンセル' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'コメントを削除' })).toBeNull()
    })

    fireEvent.click(screen.getByRole('button', { name: 'コメント 102 を削除' }))
    const secondDialog = await screen.findByRole('dialog', { name: 'コメントを削除' })
    const confirmButton = within(secondDialog).getByRole('button', { name: '削除する' })

    expect((confirmButton as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(confirmButton)

    await screen.findByText('コメントを削除しました')
    await waitFor(() => {
      expect(screen.queryByText('We are investigating this now.')).toBeNull()
    })
  })

  it('creates a ticket, shows a toast, and preserves list search params on return', async () => {
    const { router } = renderRoute(
      '/tickets/new?q=Login&status=open&sortBy=id&sortOrder=asc&page=2&pageSize=20',
    )

    await screen.findByRole('button', { name: '作成する' })
    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'Write docs' },
    })
    fireEvent.change(screen.getByLabelText('担当者'), {
      target: { value: 'sora' },
    })
    fireEvent.click(screen.getByRole('button', { name: '作成する' }))

    await screen.findByText('チケットを作成しました')
    await screen.findByText('Write docs')
    fireEvent.click(screen.getByRole('button', { name: '一覧に戻る' }))

    await screen.findByDisplayValue('Login')
    expect(router.state.location.search).toMatchObject({
      q: 'Login',
      status: 'open',
      page: 2,
      pageSize: 20,
    })
  })

  it('updates a ticket from the edit page and returns to detail with a toast', async () => {
    const { router } = renderRoute(
      '/tickets/1/edit?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=20',
    )

    await screen.findByDisplayValue('Login bug')
    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'Login bug resolved' },
    })
    fireEvent.click(screen.getByRole('button', { name: '更新する' }))

    await screen.findByText('チケットを更新しました')
    await screen.findByText('Login bug resolved')
    expect(router.state.location.search).toMatchObject({
      status: 'open',
      pageSize: 20,
    })
  })

  it('remounts the edit page when ticketId changes so a new form starts from fetched values', async () => {
    const { router } = renderRoute(
      '/tickets/1/edit?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=20',
    )

    await screen.findByDisplayValue('Login bug')
    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'draft title for ticket 1' },
    })

    await router.navigate({
      to: '/tickets/$ticketId/edit',
      params: { ticketId: '2' },
      search: {
        status: 'open',
        sortBy: 'id',
        sortOrder: 'asc',
        page: 1,
        pageSize: 20,
      },
    })

    await screen.findByText('チケット #2 を編集')
    await waitFor(() => {
      expect((screen.getByLabelText('タイトル') as HTMLInputElement).value).toBe(
        'Refactor filters',
      )
    })
  })

  it('remounts the detail page when ticketId changes so comment draft state is reset', async () => {
    const { router } = renderRoute(
      '/tickets/1?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=20',
    )

    await screen.findByText('Initial investigation started.')
    fireEvent.change(screen.getByLabelText('コメントを追加'), {
      target: { value: 'draft comment for ticket 1' },
    })

    await router.navigate({
      to: '/tickets/$ticketId',
      params: { ticketId: '2' },
      search: {
        status: 'open',
        sortBy: 'id',
        sortOrder: 'asc',
        page: 1,
        pageSize: 20,
      },
    })

    await screen.findByText('Refactor filters')
    expect((screen.getByLabelText('コメントを追加') as HTMLTextAreaElement).value).toBe('')
  })

  it('keeps unsaved search input when opening the delete modal', async () => {
    renderRoute('/tickets?status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10')

    await screen.findByText('Login bug')
    fireEvent.change(screen.getByLabelText('タイトル'), {
      target: { value: 'draft filter' },
    })

    fireEvent.click(screen.getAllByRole('button', { name: '削除' })[0] as HTMLElement)

    await screen.findByText('この操作は取り消せません。削除対象を確認してください。')
    expect((screen.getByLabelText('タイトル') as HTMLInputElement).value).toBe('draft filter')
  })

  it('deletes a ticket from the list, shows a toast, and keeps the current search params', async () => {
    const { router } = renderRoute(
      '/tickets?q=Login&status=open&sortBy=id&sortOrder=asc&page=1&pageSize=10',
    )

    await screen.findByText('Login bug')
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    await screen.findByText('この操作は取り消せません。削除対象を確認してください。')
    fireEvent.click(screen.getByRole('button', { name: '削除する' }))

    await screen.findByText('チケットを削除しました')
    await waitFor(() => {
      expect(screen.queryByText('Login bug')).toBeNull()
    })
    expect(router.state.location.search).toMatchObject({
      q: 'Login',
      status: 'open',
    })
  })
})
