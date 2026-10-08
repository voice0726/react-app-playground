import {
  CreateTicketCommentRequest,
  type CreateTicketCommentRequest as CreateTicketCommentRequestType,
  CreateTicketRequest,
  type CreateTicketRequest as CreateTicketRequestType,
  type Ticket,
  ticketDetailSchema,
  ticketIdSchema,
  ticketsResponseSchema,
  UpdateTicketRequest,
  type UpdateTicketRequest as UpdateTicketRequestType,
} from '@/features/tickets/schemas/index'
import type { TicketsSearch } from '@/features/tickets/schemas/search'
import {
  ensureSuccess,
  fetchApi,
  JSON_HEADERS,
  parseJsonResponse,
} from '@/lib/http'
import { withQuery } from '@/lib/url'

const parseTicketId = (id: Ticket['id']) => ticketIdSchema.parse(id)

const requestTicketsApi = (endpoint: string, options: RequestInit, fallbackMessage: string) =>
  fetchApi(endpoint, options, fallbackMessage)

const parseTicketResponse = (response: Response, endpoint: string) =>
  parseJsonResponse(response, endpoint, ticketDetailSchema.parse)

export const fetchTickets = async (filters: TicketsSearch) => {
  const endpoint = withQuery('/api/tickets', filters)
  const response = await requestTicketsApi(
    endpoint,
    {
      credentials: 'include',
      headers: JSON_HEADERS,
    },
    'チケット一覧の取得に失敗しました。',
  )

  await ensureSuccess(response, 'チケット一覧の取得に失敗しました。')

  return parseJsonResponse(response, endpoint, ticketsResponseSchema.parse)
}

export const fetchTicket = async (id: Ticket['id']) => {
  const ticketId = parseTicketId(id)
  const endpoint = `/api/tickets/${ticketId}`
  const response = await requestTicketsApi(
    endpoint,
    {
      credentials: 'include',
      headers: JSON_HEADERS,
    },
    'チケット情報の取得に失敗しました。',
  )

  await ensureSuccess(response, 'チケット情報の取得に失敗しました。')

  return parseTicketResponse(response, endpoint)
}

export const createTicket = async (body: CreateTicketRequestType) => {
  const payload = CreateTicketRequest.parse(body)
  const endpoint = '/api/tickets'
  const response = await requestTicketsApi(
    endpoint,
    {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
    'チケットの作成に失敗しました。',
  )

  await ensureSuccess(response, 'チケットの作成に失敗しました。')

  return parseTicketResponse(response, endpoint)
}

export const updateTicket = async (body: UpdateTicketRequestType) => {
  const { id, ...payload } = UpdateTicketRequest.parse(body)
  const endpoint = `/api/tickets/${id}`
  const response = await requestTicketsApi(
    endpoint,
    {
      method: 'PUT',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
    'チケットの更新に失敗しました。',
  )

  await ensureSuccess(response, 'チケットの更新に失敗しました。')

  return parseTicketResponse(response, endpoint)
}

export const deleteTicket = async (id: Ticket['id']): Promise<void> => {
  const ticketId = parseTicketId(id)
  const endpoint = `/api/tickets/${ticketId}`
  const response = await requestTicketsApi(
    endpoint,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: JSON_HEADERS,
    },
    'チケットの削除に失敗しました。',
  )

  await ensureSuccess(response, 'チケットの削除に失敗しました。')
}

export const createTicketComment = async ({
  ticketId,
  body,
}: {
  ticketId: Ticket['id']
  body: CreateTicketCommentRequestType['body']
}) => {
  const parsedTicketId = parseTicketId(ticketId)
  const payload = CreateTicketCommentRequest.parse({ body })
  const endpoint = `/api/tickets/${parsedTicketId}/comments`
  const response = await requestTicketsApi(
    endpoint,
    {
      method: 'POST',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
    'コメントの投稿に失敗しました。',
  )

  await ensureSuccess(response, 'コメントの投稿に失敗しました。')

  return parseTicketResponse(response, endpoint)
}

export const updateTicketComment = async ({
  ticketId,
  commentId,
  body,
}: {
  ticketId: Ticket['id']
  commentId: number
  body: CreateTicketCommentRequestType['body']
}) => {
  const parsedTicketId = parseTicketId(ticketId)
  const parsedCommentId = ticketIdSchema.parse(commentId)
  const payload = CreateTicketCommentRequest.parse({ body })
  const endpoint = `/api/tickets/${parsedTicketId}/comments/${parsedCommentId}`
  const response = await requestTicketsApi(
    endpoint,
    {
      method: 'PUT',
      credentials: 'include',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
    'コメントの更新に失敗しました。',
  )

  await ensureSuccess(response, 'コメントの更新に失敗しました。')

  return parseTicketResponse(response, endpoint)
}

export const deleteTicketComment = async ({
  ticketId,
  commentId,
}: {
  ticketId: Ticket['id']
  commentId: number
}) => {
  const parsedTicketId = parseTicketId(ticketId)
  const parsedCommentId = ticketIdSchema.parse(commentId)
  const endpoint = `/api/tickets/${parsedTicketId}/comments/${parsedCommentId}`
  const response = await requestTicketsApi(
    endpoint,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: JSON_HEADERS,
    },
    'コメントの削除に失敗しました。',
  )

  await ensureSuccess(response, 'コメントの削除に失敗しました。')

  return parseTicketResponse(response, endpoint)
}
