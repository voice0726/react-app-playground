import { organizationData } from './organizationData'
import { http, HttpResponse } from 'msw'

import { invoices as seedInvoices, type Invoice, type InvoiceStatus } from '../data/seed'
import { createId, listResponse, notFound, numberValue, readJsonObject, stringValue } from './utils'

const store = organizationData<Invoice>(seedInvoices)
export const invoiceSnapshot = store.snapshot

export function resetInvoiceState(): void {
  store.reset()
}

function findInvoice(id: string, request: Request): Invoice | undefined {
  return store.get(request).find((invoice) => invoice.id === id)
}

function invoiceStatus(value: unknown, fallback: InvoiceStatus): InvoiceStatus {
  const status = stringValue(value)

  if (status === 'draft' || status === 'sent' || status === 'paid' || status === 'cancelled') {
    return status
  }

  return fallback
}

function canTransitionInvoiceStatus(current: InvoiceStatus, next: InvoiceStatus): boolean {
  if (current === next || next === 'cancelled') {
    return true
  }

  return (current === 'draft' && next === 'sent') || (current === 'sent' && next === 'paid')
}

export const invoiceHandlers = [
  http.get('*/api/invoices', ({ request }) =>
    listResponse(request, filterOverdue(request, store.get(request)), {
      sortableFields: ['number', 'customerId', 'amount', 'issueDate', 'dueDate', 'status', 'id'],
      // 請求書のモックは作成日時を持たないため、作成順と一致する ID で既定の並びを作る
      defaultSort: 'id',
      matches: (invoice, query) => invoice.number.toLowerCase().includes(query),
    }),
  ),
  http.get('*/api/invoices/:id', ({ params, request }) => {
    const id = stringValue(params.id)
    const invoice = id === undefined ? undefined : findInvoice(id, request)

    if (invoice === undefined) {
      return notFound('Invoice')
    }

    return HttpResponse.json(invoice)
  }),
  http.post('*/api/invoices/bulk-status', async ({ request }) => {
    const invoices = store.get(request)
    const body = await readJsonObject(request)
    const ids = Array.isArray(body.ids) && body.ids.every((id) => typeof id === 'string') ? body.ids : []
    const from = stringValue(body.from)
    const to = stringValue(body.to)
    if (ids.length === 0 || ids.length > 100 || new Set(ids).size !== ids.length ||
      !((from === 'draft' && to === 'sent') || (from === 'sent' && to === 'paid'))) {
      return HttpResponse.json({ error: { code: 'invoice_bulk_status_validation', message: 'Invalid bulk status request.' } }, { status: 400 })
    }
    const missing = ids.filter((id) => !invoices.some((invoice) => invoice.id === id))
    if (missing.length > 0) {
      return HttpResponse.json({ error: { code: 'invoice_not_found', message: 'Some invoices were not found.', details: { invoiceIds: missing } } }, { status: 404 })
    }
    const conflicted = ids.filter((id) => invoices.find((invoice) => invoice.id === id)?.status !== from)
    if (conflicted.length > 0) {
      return HttpResponse.json({ error: { code: 'invoice_status_conflict', message: 'Some invoices are no longer in the expected status.', details: { invoiceIds: conflicted } } }, { status: 409 })
    }
    const selected = new Set(ids)
    const updated = invoices.map((invoice) => {
      if (!selected.has(invoice.id)) return invoice
      return Object.assign({}, invoice, { status: to as InvoiceStatus })
    })
    store.set(request, updated)
    return HttpResponse.json({ items: ids.map((id) => updated.find((invoice) => invoice.id === id)) })
  }),
  http.post('*/api/invoices', async ({ request }) => {
    const invoices = store.get(request)
    const body = await readJsonObject(request)
    const invoice: Invoice = {
      id: createId('invoice', invoices.length),
      number: stringValue(body.number) ?? `INV-2026-${String(invoices.length + 1).padStart(4, '0')}`,
      customerId: stringValue(body.customerId) ?? 'customer-001',
      amount: numberValue(body.amount) ?? 0,
      issueDate: stringValue(body.issueDate) ?? '2026-03-01',
      dueDate: stringValue(body.dueDate) ?? '2026-03-31',
      status: invoiceStatus(body.status, 'draft'),
    }

    store.set(request, [...invoices, invoice])

    return HttpResponse.json(invoice, { status: 201 })
  }),
  http.patch('*/api/invoices/:id', async ({ params, request }) => {
    const invoices = store.get(request)
    const id = stringValue(params.id)
    const invoice = id === undefined ? undefined : findInvoice(id, request)

    if (id === undefined || invoice === undefined) {
      return notFound('Invoice')
    }

    const body = await readJsonObject(request)
    const nextStatus = invoiceStatus(body.status, invoice.status)

    if (!canTransitionInvoiceStatus(invoice.status, nextStatus)) {
      return HttpResponse.json({ message: 'Invalid invoice status transition' }, { status: 409 })
    }

    const updated: Invoice = {
      ...invoice,
      number: stringValue(body.number) ?? invoice.number,
      customerId: stringValue(body.customerId) ?? invoice.customerId,
      amount: numberValue(body.amount) ?? invoice.amount,
      issueDate: stringValue(body.issueDate) ?? invoice.issueDate,
      dueDate: stringValue(body.dueDate) ?? invoice.dueDate,
      status: nextStatus,
    }

    store.set(request, invoices.map((item) => (item.id === id ? updated : item)))

    return HttpResponse.json(updated)
  }),
]

function filterOverdue(request: Request, invoices: Invoice[]): Invoice[] {
  const params = new URL(request.url).searchParams
  if (params.get('overdue') !== 'true') return invoices
  const today = params.get('today') ?? new Date().toISOString().slice(0, 10)
  return invoices.filter((invoice) => invoice.status === 'sent' && invoice.dueDate < today)
}
