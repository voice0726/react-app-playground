import { organizationData } from './organizationData'
import { http, HttpResponse } from 'msw'

import { deals as seedDeals, type Deal, type DealStatus } from '../data/seed'
import { createId, listResponse, notFound, numberValue, readJsonObject, stringValue } from './utils'

const store = organizationData<Deal>(seedDeals)
export const dealSnapshot = store.snapshot

export function resetDealState(): void {
  store.reset()
}

function findDeal(id: string, request: Request): Deal | undefined {
  return store.get(request).find((deal) => deal.id === id)
}

function dealStatus(value: unknown, fallback: DealStatus): DealStatus {
  const status = stringValue(value)

  if (status === 'open' || status === 'won' || status === 'lost') {
    return status
  }

  return fallback
}

export const dealHandlers = [
  http.get('*/api/deals', ({ request }) =>
    listResponse(request, store.get(request), {
      sortableFields: ['title', 'customerId', 'amount', 'status', 'createdAt'],
      defaultSort: 'createdAt',
      matches: (deal, query) => deal.title.toLowerCase().includes(query),
    }),
  ),
  http.get('*/api/deals/:id', ({ params, request }) => {
    const id = stringValue(params.id)
    const deal = id === undefined ? undefined : findDeal(id, request)

    if (deal === undefined) {
      return notFound('Deal')
    }

    return HttpResponse.json(deal)
  }),
  http.post('*/api/deals', async ({ request }) => {
    const deals = store.get(request)
    const body = await readJsonObject(request)
    const deal: Deal = {
      id: createId('deal', deals.length),
      title: stringValue(body.title) ?? 'New deal',
      customerId: stringValue(body.customerId) ?? 'customer-001',
      amount: numberValue(body.amount) ?? 0,
      status: dealStatus(body.status, 'open'),
      createdAt: new Date().toISOString(),
    }

    store.set(request, [...deals, deal])

    return HttpResponse.json(deal, { status: 201 })
  }),
  http.patch('*/api/deals/:id', async ({ params, request }) => {
    const deals = store.get(request)
    const id = stringValue(params.id)
    const deal = id === undefined ? undefined : findDeal(id, request)

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

    store.set(request, deals.map((item) => (item.id === id ? updated : item)))

    return HttpResponse.json(updated)
  }),
]
