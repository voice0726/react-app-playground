import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketsSearchForm } from '@/features/tickets/components/list/TicketsSearchForm'
import type { TicketsSearchFormOutput } from '@/features/tickets/schemas/search'

const initialValues = { q: '', status: 'all' as const, sortBy: 'id' as const, sortOrder: 'asc' as const }

afterEach(cleanup)

describe('TicketsSearchForm', () => {
  it('submits a normalized query', async () => {
    const onSubmit = vi.fn<(values: TicketsSearchFormOutput) => void>()
    render(
      <MantineProvider>
        <TicketsSearchForm initialValues={initialValues} onSubmit={onSubmit} />
      </MantineProvider>,
    )

    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '  bug  ' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      q: 'bug',
      status: 'all',
      sortBy: 'id',
      sortOrder: 'asc',
    })
  })
})
