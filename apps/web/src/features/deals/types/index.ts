export type DealStatus = 'open' | 'won' | 'lost'

export type Deal = {
  id: string
  title: string
  customerId: string
  amount: number
  status: DealStatus
  createdAt: string
}
