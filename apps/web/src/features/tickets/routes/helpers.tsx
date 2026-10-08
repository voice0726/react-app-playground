export const parseTicketId = (ticketIdParam: string) => {
  const ticketId = Number(ticketIdParam)

  return Number.isInteger(ticketId) && ticketId > 0 ? ticketId : null
}
