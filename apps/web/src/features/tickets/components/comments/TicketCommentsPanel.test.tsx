import { TestOrganization } from '@/test/organization'
import { MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { TicketCommentsPanel } from './TicketCommentsPanel'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

const renderCommentsSection = (ui: ReactNode) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}><TestOrganization>
      <MantineProvider>
        <Notifications />
        {ui}
      </MantineProvider>
    </TestOrganization></QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
})

describe('TicketCommentsPanel', () => {
  it('does not render ownership actions without a resolved current user and author', () => {
    renderCommentsSection(
      <TicketCommentsPanel
        comments={{
          items: [
            {
              id: 101,
              body: 'Author could not be resolved.',
              createdBy: undefined,
              createdAt: '2026-03-03T15:00:00Z',
            },
          ],
        }}
        currentUserId={undefined}
        ticketId={1}
        ticketTitle="Login bug"
      />,
    )

    expect(screen.getByText('不明なユーザー')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'コメント 101 を編集' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'コメント 101 を削除' })).toBeNull()
  })

  it('restores the original comment body when reopening inline edit', async () => {
    renderCommentsSection(
      <TicketCommentsPanel
        comments={{
          items: [
            {
              id: 101,
              body: 'Initial investigation started.',
              createdBy: { id: '1', email: 'aki@example.com', displayName: 'Aki' },
              createdAt: '2026-03-03T15:00:00Z',
            },
          ],
        }}
        currentUserId="1"
        ticketId={1}
        ticketTitle="Login bug"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'コメント 101 を編集' }))
    const editField = screen.getByLabelText('コメントを編集') as HTMLTextAreaElement
    expect(editField.value).toBe('Initial investigation started.')

    fireEvent.change(editField, {
      target: { value: 'Draft update that should be discarded.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    fireEvent.click(screen.getByRole('button', { name: 'コメント 101 を編集' }))
    expect((screen.getByLabelText('コメントを編集') as HTMLTextAreaElement).value).toBe(
      'Initial investigation started.',
    )
  })
})
