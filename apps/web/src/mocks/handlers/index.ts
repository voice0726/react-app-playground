import { authHandlers } from './auth'
import { customerHandlers, resetCustomerState } from './customers'
import { dealHandlers, resetDealState } from './deals'
import { invoiceHandlers, resetInvoiceState } from './invoices'
import { resetTaskState, taskHandlers } from './tasks'
import { resetTicketState, ticketHandlers } from './tickets'

export const handlers = [
  ...authHandlers,
  ...customerHandlers,
  ...dealHandlers,
  ...invoiceHandlers,
  ...taskHandlers,
  ...ticketHandlers,
]

export function resetMockState(): void {
  resetCustomerState()
  resetDealState()
  resetInvoiceState()
  resetTaskState()
  resetTicketState()
}
