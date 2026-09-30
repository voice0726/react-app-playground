import { customerHandlers, resetCustomerState } from './customers'
import { dealHandlers, resetDealState } from './deals'
import { invoiceHandlers, resetInvoiceState } from './invoices'
import { resetTaskState, taskHandlers } from './tasks'

export const handlers = [
  ...customerHandlers,
  ...dealHandlers,
  ...invoiceHandlers,
  ...taskHandlers,
]

export function resetMockState(): void {
  resetCustomerState()
  resetDealState()
  resetInvoiceState()
  resetTaskState()
}
