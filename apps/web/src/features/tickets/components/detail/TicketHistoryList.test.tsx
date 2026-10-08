import { MantineProvider } from '@mantine/core'
import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { type TicketHistory, ticketActorSchema } from '@/features/tickets/schemas/index'
import { formatDateTime } from '@/lib/date'
import { TicketHistoryList } from './TicketHistoryList'

const renderHistory = (ui: ReactNode) => render(<MantineProvider>{ui}</MantineProvider>)

afterEach(() => {
  cleanup()
})

const TICKET_EDITOR = ticketActorSchema.parse({
  id: '12',
  email: 'editor@example.com',
  displayName: 'Editor User',
})

describe('TicketHistoryList', () => {
  it('renders an empty state when there is no history', () => {
    renderHistory(<TicketHistoryList history={{ items: [] }} />)

    expect(screen.getByText('操作履歴')).toBeTruthy()
    expect(screen.getByText('まだ変更履歴はありません。')).toBeTruthy()
  })

  it('renders formatted history entries', () => {
    const history: TicketHistory = {
      items: [
        {
          operationId: 'mock-op-1',
          actor: TICKET_EDITOR,
          changedAt: '2026-03-06T11:00:00Z',
          changes: [
            {
              field: 'status',
              before: 'open',
              after: 'closed',
            },
          ],
        },
      ],
    }

    renderHistory(<TicketHistoryList history={history} />)

    const changedAt = history.items[0]?.changedAt ?? ''

    expect(screen.getByText(formatDateTime(changedAt))).toBeTruthy()
    expect(screen.getByText('ステータス')).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()
    expect(screen.getByText('Closed')).toBeTruthy()
    expect(screen.getByText('Editor User')).toBeTruthy()
    expect(screen.getByText('editor@example.com')).toBeTruthy()
  })
})
