import { http, HttpResponse } from 'msw'

import type { Customer, CustomerStatus } from '@/types/customer.types'

import { customers as seedCustomers } from '../data/seed'
import { createId, notFound, readJsonObject, stringValue } from './utils'

let customers: Customer[] = [...seedCustomers]

export function resetCustomerState(): void {
  customers = [...seedCustomers]
}

function findCustomer(id: string): Customer | undefined {
  return customers.find((customer) => customer.id === id)
}

function customerStatus(value: unknown, fallback: CustomerStatus): CustomerStatus {
  const status = stringValue(value)

  if (status === 'active' || status === 'inactive') {
    return status
  }

  return fallback
}

export const customerHandlers = [
  http.get('*/api/customers', () => HttpResponse.json(customers)),
  http.get('*/api/customers/:id', ({ params }) => {
    const id = stringValue(params.id)
    const customer = id === undefined ? undefined : findCustomer(id)

    if (customer === undefined) {
      return notFound('Customer')
    }

    return HttpResponse.json(customer)
  }),
  http.post('*/api/customers', async ({ request }) => {
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

    customers = [...customers, customer]

    return HttpResponse.json(customer, { status: 201 })
  }),
  http.patch('*/api/customers/:id', async ({ params, request }) => {
    const id = stringValue(params.id)
    const customer = id === undefined ? undefined : findCustomer(id)

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

    customers = customers.map((item) => (item.id === id ? updated : item))

    return HttpResponse.json(updated)
  }),
  http.delete('*/api/customers/:id', ({ params }) => {
    const id = stringValue(params.id)
    const customer = id === undefined ? undefined : findCustomer(id)

    if (id === undefined || customer === undefined) {
      return notFound('Customer')
    }

    customers = customers.filter((item) => item.id !== id)

    return HttpResponse.json({ success: true })
  }),
]
