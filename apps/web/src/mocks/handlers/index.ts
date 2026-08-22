import { authHandlers, resetAuthState } from './auth'
import { customerHandlers, resetCustomerState } from './customers'
import { dealHandlers, resetDealState } from './deals'
import { invoiceHandlers, resetInvoiceState } from './invoices'
import { resetTaskState, taskHandlers } from './tasks'

export const handlers = [
  ...authHandlers,
  ...customerHandlers,
  ...dealHandlers,
  ...invoiceHandlers,
  ...taskHandlers,
]

export function resetMockState(): void {
  resetAuthState()
  resetCustomerState()
  resetDealState()
  resetInvoiceState()
  resetTaskState()
}
