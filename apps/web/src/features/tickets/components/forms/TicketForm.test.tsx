import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TicketForm } from '@/features/tickets/components/forms/TicketForm'
import type { TicketFormOutput } from '@/features/tickets/schemas/form'

const renderForm = (onSubmit = vi.fn<(values: TicketFormOutput) => void>()) =>
  render(
    <MantineProvider>
      <TicketForm
        initialValues={{ title: '', status: 'open', assignee: '' }}
        isSubmitting={false}
        onSubmit={onSubmit}
        submitLabel="作成する"
      />
    </MantineProvider>,
  )

afterEach(cleanup)

describe('TicketForm', () => {
  it('shows title validation feedback and prevents submission', async () => {
    const onSubmit = vi.fn<(values: TicketFormOutput) => void>()
    renderForm(onSubmit)
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '作成する' }))

    expect(await screen.findByText('タイトルは必須です')).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits normalized title and empty assignee values', async () => {
    const onSubmit = vi.fn<(values: TicketFormOutput) => void>()
    renderForm(onSubmit)
    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '  Bug  ' } })
    fireEvent.change(screen.getByLabelText('担当者'), { target: { value: '  ' } })
    fireEvent.click(screen.getByRole('button', { name: '作成する' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ title: 'Bug', status: 'open', assignee: null })
  })
})
