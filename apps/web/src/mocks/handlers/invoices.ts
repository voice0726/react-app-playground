import { http, HttpResponse } from 'msw'

import { invoices as seedInvoices, type Invoice, type InvoiceStatus } from '../data/seed'
import { createId, listResponse, notFound, numberValue, readJsonObject, stringValue } from './utils'

let invoices: Invoice[] = [...seedInvoices]

export function resetInvoiceState(): void {
  invoices = [...seedInvoices]
}

function findInvoice(id: string): Invoice | undefined {
  return invoices.find((invoice) => invoice.id === id)
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
    listResponse(request, invoices, {
      sortableFields: ['number', 'customerId', 'amount', 'issueDate', 'dueDate', 'status', 'id'],
      // 請求書のモックは作成日時を持たないため、作成順と一致する ID で既定の並びを作る
      defaultSort: 'id',
      matches: (invoice, query) => invoice.number.toLowerCase().includes(query),
    }),
  ),
  http.get('*/api/invoices/:id', ({ params }) => {
    const id = stringValue(params.id)
    const invoice = id === undefined ? undefined : findInvoice(id)

    if (invoice === undefined) {
      return notFound('Invoice')
    }

    return HttpResponse.json(invoice)
  }),
  http.post('*/api/invoices', async ({ request }) => {
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

    invoices = [...invoices, invoice]

    return HttpResponse.json(invoice, { status: 201 })
  }),
  http.patch('*/api/invoices/:id', async ({ params, request }) => {
    const id = stringValue(params.id)
    const invoice = id === undefined ? undefined : findInvoice(id)

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

    invoices = invoices.map((item) => (item.id === id ? updated : item))

    return HttpResponse.json(updated)
  }),
]
