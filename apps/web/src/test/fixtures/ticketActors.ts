import { ticketActorSchema } from '@/features/tickets/schemas/index'

export const TICKET_CREATOR = ticketActorSchema.parse({
  id: '11',
  email: 'creator@example.com',
  displayName: 'Creator User',
})

export const TICKET_EDITOR = ticketActorSchema.parse({
  id: '12',
  email: 'editor@example.com',
  displayName: 'Editor User',
})

export const TICKET_ADMIN = ticketActorSchema.parse({
  id: '1',
  email: 'admin@example.com',
  displayName: 'Admin User',
})
