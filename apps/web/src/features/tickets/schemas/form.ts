import * as z from 'zod'
import {
  ticketAssigneeFieldSchema,
  ticketCommentBodyFieldSchema,
  ticketTitleFieldSchema,
} from './index'

export const TICKET_FORM_DEFAULT_VALUES = {
  title: '',
  status: 'open',
  assignee: '',
} as const

export const ticketFormValuesSchema = z.object({
  title: ticketTitleFieldSchema,
  status: z.enum(['open', 'closed']),
  assignee: ticketAssigneeFieldSchema,
})

export type TicketFormInput = z.input<typeof ticketFormValuesSchema>
export type TicketFormOutput = z.output<typeof ticketFormValuesSchema>

export const TICKET_COMMENT_FORM_DEFAULT_VALUES = {
  body: '',
} as const

export const ticketCommentFormValuesSchema = z.object({
  body: ticketCommentBodyFieldSchema,
})

export type TicketCommentFormInput = z.input<typeof ticketCommentFormValuesSchema>
export type TicketCommentFormOutput = z.output<typeof ticketCommentFormValuesSchema>
