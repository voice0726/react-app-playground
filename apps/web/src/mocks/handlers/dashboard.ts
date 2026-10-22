import { http, HttpResponse } from 'msw'

import type { Invoice } from '@/features/invoices/types'
import type { InvoiceSummary } from '@/types/dashboard.types'
import { customerSnapshot } from './customers'
import { dealSnapshot } from './deals'
import { invoiceSnapshot } from './invoices'
import { taskSnapshot } from './tasks'

function summarize(invoices: Invoice[], today: string): InvoiceSummary {
  const sent = invoices.filter((invoice) => invoice.status === 'sent')
  const overdue = sent.filter((invoice) => invoice.dueDate < today)
  return {
    draftCount: invoices.filter((invoice) => invoice.status === 'draft').length,
    outstandingAmount: sent.reduce((total, invoice) => total + invoice.amount, 0),
    overdueCount: overdue.length,
    overdueAmount: overdue.reduce((total, invoice) => total + invoice.amount, 0),
  }
}

function summaryDate(request: Request) {
  const today = new URL(request.url).searchParams.get('today') || new Date().toISOString().slice(0, 10)
  const date = new Date(today)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(date.getTime())) return undefined
  if (date.toISOString().slice(0, 10) !== today) return undefined
  return today
}

export const dashboardHandlers = [
  http.get('*/api/dashboard', ({ request }) => {
    const id = request.headers.get('X-Organization-ID') ?? ''
    const today = summaryDate(request)
    if (!today) return HttpResponse.json({ message: 'Invalid today date.' }, { status: 400 })
    const invoices = invoiceSnapshot(id)
    return HttpResponse.json({
      customers: customerSnapshot(id).length,
      deals: dealSnapshot(id).length,
      invoices: invoices.length,
      tasks: taskSnapshot(id).length,
      invoiceSummary: summarize(invoices, today),
    })
  }),
  http.get('*/api/invoices/summary', ({ request }) => {
    const params = new URL(request.url).searchParams
    const id = request.headers.get('X-Organization-ID') ?? ''
    const today = summaryDate(request)
    if (!today) return HttpResponse.json({ message: 'Invalid today date.' }, { status: 400 })
    const customerId = params.get('customerId')
    const invoices = invoiceSnapshot(id).filter((invoice) => !customerId || invoice.customerId === customerId)
    return HttpResponse.json(summarize(invoices, today))
  }),
]
