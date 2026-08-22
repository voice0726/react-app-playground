import { http, HttpResponse } from 'msw'

import { deals as seedDeals, type Deal, type DealStatus } from '../data/seed'
import { createId, notFound, numberValue, readJsonObject, stringValue } from './utils'

let deals: Deal[] = [...seedDeals]

export function resetDealState(): void {
  deals = [...seedDeals]
}

function findDeal(id: string): Deal | undefined {
  return deals.find((deal) => deal.id === id)
}

function dealStatus(value: unknown, fallback: DealStatus): DealStatus {
  const status = stringValue(value)

  if (status === 'open' || status === 'won' || status === 'lost') {
    return status
  }

  return fallback
}

export const dealHandlers = [
  http.get('*/api/deals', () => HttpResponse.json(deals)),
  http.get('*/api/deals/:id', ({ params }) => {
    const id = stringValue(params.id)
    const deal = id === undefined ? undefined : findDeal(id)

    if (deal === undefined) {
      return notFound('Deal')
    }

    return HttpResponse.json(deal)
  }),
  http.post('*/api/deals', async ({ request }) => {
    const body = await readJsonObject(request)
    const deal: Deal = {
      id: createId('deal', deals.length),
      title: stringValue(body.title) ?? 'New deal',
      customerId: stringValue(body.customerId) ?? 'customer-001',
      amount: numberValue(body.amount) ?? 0,
      status: dealStatus(body.status, 'open'),
      createdAt: new Date().toISOString(),
    }

    deals = [...deals, deal]

    return HttpResponse.json(deal, { status: 201 })
  }),
  http.patch('*/api/deals/:id', async ({ params, request }) => {
    const id = stringValue(params.id)
    const deal = id === undefined ? undefined : findDeal(id)

    if (id === undefined || deal === undefined) {
      return notFound('Deal')
    }

    const body = await readJsonObject(request)
    const updated: Deal = {
      ...deal,
      title: stringValue(body.title) ?? deal.title,
      customerId: stringValue(body.customerId) ?? deal.customerId,
      amount: numberValue(body.amount) ?? deal.amount,
      status: dealStatus(body.status, deal.status),
    }

    deals = deals.map((item) => (item.id === id ? updated : item))

    return HttpResponse.json(updated)
  }),
]
