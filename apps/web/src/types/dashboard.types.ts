export type InvoiceSummary = {
  draftCount: number
  outstandingAmount: number
  overdueCount: number
  overdueAmount: number
}

export type DashboardSummary = {
  customers: number
  deals: number
  invoices: number
  tasks: number
  invoiceSummary: InvoiceSummary
}
