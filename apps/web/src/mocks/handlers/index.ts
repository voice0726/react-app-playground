import { organizationHandlers, resetOrganizationState } from './organizations'
import { dashboardHandlers } from './dashboard'
import { authHandlers } from './auth'
import { customerHandlers, resetCustomerState } from './customers'
import { dealHandlers, resetDealState } from './deals'
import { invoiceHandlers, resetInvoiceState } from './invoices'
import { resetTaskState, taskHandlers } from './tasks'
import { resetTicketState, ticketHandlers } from './tickets'

export const handlers = [
  ...organizationHandlers,
  ...dashboardHandlers,
  ...authHandlers,
  ...customerHandlers,
  ...dealHandlers,
  ...invoiceHandlers,
  ...taskHandlers,
  ...ticketHandlers,
]

export function resetMockState(): void {
  resetOrganizationState()
  resetCustomerState()
  resetDealState()
  resetInvoiceState()
  resetTaskState()
  resetTicketState()
}
