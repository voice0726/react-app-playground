import { organizationData } from './organizationData'
import { http, HttpResponse } from 'msw'

import type { Customer, CustomerStatus } from '@/types/customer.types'

import { customers as seedCustomers } from '../data/seed'
import { createId, listResponse, notFound, readJsonObject, stringValue } from './utils'

const store = organizationData<Customer>(seedCustomers)
export const customerSnapshot = store.snapshot

export function resetCustomerState(): void {
  store.reset()
}

function findCustomer(id: string, request: Request): Customer | undefined {
  return store.get(request).find((customer) => customer.id === id)
}

function customerStatus(value: unknown, fallback: CustomerStatus): CustomerStatus {
  const status = stringValue(value)

  if (status === 'active' || status === 'inactive') {
    return status
  }

  return fallback
}

export const customerHandlers = [
  http.get('*/api/customers', ({ request }) =>
    listResponse(request, store.get(request), {
      sortableFields: ['name', 'email', 'phone', 'status', 'createdAt'],
      defaultSort: 'createdAt',
      matches: (customer, query) =>
        [customer.name, customer.email, customer.phone].some((value) => value.toLowerCase().includes(query)),
    }),
  ),
  http.get('*/api/customers/:id', ({ params, request }) => {
    const id = stringValue(params.id)
    const customer = id === undefined ? undefined : findCustomer(id, request)

    if (customer === undefined) {
      return notFound('Customer')
    }

    return HttpResponse.json(customer)
  }),
  http.post('*/api/customers', async ({ request }) => {
    const customers = store.get(request)
    const body = await readJsonObject(request)
    const createdAt = new Date().toISOString()
    const customer: Customer = {
      id: createId('customer', customers.length),
      name: stringValue(body.name) ?? 'New Customer',
      email: stringValue(body.email) ?? 'new-customer@example.com',
      phone: stringValue(body.phone) ?? '03-0000-0000',
      status: customerStatus(body.status, 'active'),
      createdAt,
    }

    store.set(request, [...customers, customer])

    return HttpResponse.json(customer, { status: 201 })
  }),
  http.patch('*/api/customers/:id', async ({ params, request }) => {
    const customers = store.get(request)
    const id = stringValue(params.id)
    const customer = id === undefined ? undefined : findCustomer(id, request)

    if (id === undefined || customer === undefined) {
      return notFound('Customer')
    }

    const body = await readJsonObject(request)
    const updated: Customer = {
      ...customer,
      name: stringValue(body.name) ?? customer.name,
      email: stringValue(body.email) ?? customer.email,
      phone: stringValue(body.phone) ?? customer.phone,
      status: customerStatus(body.status, customer.status),
    }

    store.set(request, customers.map((item) => (item.id === id ? updated : item)))

    return HttpResponse.json(updated)
  }),
  http.delete('*/api/customers/:id', ({ params, request }) => {
    const customers = store.get(request)
    const id = stringValue(params.id)
    const customer = id === undefined ? undefined : findCustomer(id, request)

    if (id === undefined || customer === undefined) {
      return notFound('Customer')
    }

    store.set(request, customers.filter((item) => item.id !== id))

    return HttpResponse.json({ success: true })
  }),
]
