import * as z from 'zod'

export const ticketActorSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
})

export type TicketActor = z.infer<typeof ticketActorSchema>

export const ticketIdSchema = z.number().int().positive()

export const ticketTitleFieldSchema = z.string().trim().min(1, 'タイトルは必須です')
export const ticketAssigneeFieldSchema = z
  .string()
  .trim()
  .transform((value) => value || null)
  .nullable()
export const ticketCommentBodyFieldSchema = z.string().trim().min(1, 'コメントは必須です')

const ticketsSchema = z.object({
  id: ticketIdSchema,
  title: z.string(),
  status: z.enum(['open', 'closed']),
  assignee: z.string().nullable().optional(),
  createdBy: ticketActorSchema.nullish(),
  updatedBy: ticketActorSchema.nullish(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export type Ticket = z.infer<typeof ticketsSchema>

const ticketHistoryChangeSchema = z.object({
  field: z.string(),
  before: z.string().nullable(),
  after: z.string().nullable(),
})

export type TicketHistoryChange = z.infer<typeof ticketHistoryChangeSchema>

const ticketHistoryItemSchema = z.object({
  operationId: z.string(),
  actor: ticketActorSchema.nullish(),
  changedAt: z.iso.datetime(),
  changes: z.array(ticketHistoryChangeSchema),
})


const ticketHistorySchema = z.object({
  items: z.array(ticketHistoryItemSchema),
})

export type TicketHistory = z.infer<typeof ticketHistorySchema>

const ticketCommentSchema = z.object({
  id: ticketIdSchema,
  body: z.string(),
  createdBy: ticketActorSchema.nullish(),
  createdAt: z.iso.datetime(),
})

export type TicketComment = z.infer<typeof ticketCommentSchema>

const ticketCommentsSchema = z.object({
  items: z.array(ticketCommentSchema),
})

export type TicketComments = z.infer<typeof ticketCommentsSchema>

export const ticketDetailSchema = ticketsSchema.extend({
  history: ticketHistorySchema,
  comments: ticketCommentsSchema,
})

export type TicketDetail = z.infer<typeof ticketDetailSchema>

export const ticketsResponseSchema = z.object({
  items: z.array(ticketsSchema),
  total: z.number().int().nonnegative(),
})

export type TicketsResponse = z.infer<typeof ticketsResponseSchema>

export const CreateTicketRequest = z.object({
  title: ticketTitleFieldSchema,
  status: z.enum(['open', 'closed']),
  assignee: ticketAssigneeFieldSchema.optional(),
})
export type CreateTicketRequest = z.infer<typeof CreateTicketRequest>

export const UpdateTicketRequest = z.object({
  id: ticketIdSchema,
  title: ticketTitleFieldSchema,
  status: z.enum(['open', 'closed']),
  assignee: ticketAssigneeFieldSchema.optional(),
})
export type UpdateTicketRequest = z.infer<typeof UpdateTicketRequest>

export const CreateTicketCommentRequest = z.object({
  body: ticketCommentBodyFieldSchema,
})

export type CreateTicketCommentRequest = z.infer<typeof CreateTicketCommentRequest>
