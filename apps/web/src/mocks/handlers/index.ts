import { authHandlers } from './auth'
import { customerHandlers } from './customers'
import { dealHandlers } from './deals'
import { invoiceHandlers } from './invoices'
import { taskHandlers } from './tasks'

export const handlers = [
  ...authHandlers,
  ...customerHandlers,
  ...dealHandlers,
  ...invoiceHandlers,
  ...taskHandlers,
]
