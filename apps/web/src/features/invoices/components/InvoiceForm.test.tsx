import { MantineProvider } from '@mantine/core'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { InvoiceForm } from '@/features/invoices/components/InvoiceForm'
import type { InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'

const runtimeEnv = (globalThis as typeof globalThis & {
  process: { env: Record<string, string | undefined> }
}).process.env
const originalTimezone = runtimeEnv.TZ

afterEach(() => {
  cleanup()
  if (originalTimezone === undefined) {
    delete runtimeEnv.TZ
  } else {
    runtimeEnv.TZ = originalTimezone
  }
})

describe('InvoiceForm', () => {
  it.each(['America/Los_Angeles', 'Asia/Tokyo'])(
    'submits the selected calendar day unchanged in %s',
    async (timezone) => {
      runtimeEnv.TZ = timezone
      const onSubmit = vi.fn<(values: InvoiceFormValues) => void>()

      render(
        <MantineProvider>
          <InvoiceForm onSubmit={onSubmit} />
        </MantineProvider>,
      )

      fireEvent.change(screen.getByLabelText('Invoice number'), { target: { value: 'INV-1' } })
      fireEvent.change(screen.getByLabelText('Customer ID'), { target: { value: 'customer-1' } })
      fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '100' } })
      fireEvent.change(screen.getByLabelText('Issue date'), { target: { value: '2026-10-10' } })
      fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-10-20' } })
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(onSubmit).toHaveBeenCalled())
      expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
        issueDate: '2026-10-10',
        dueDate: '2026-10-20',
      })
    },
  )

  it.each([
    ['Issue date', 'Issue date is required'],
    ['Due date', 'Due date is required'],
  ] as const)('treats an emptied %s input as missing', async (label, errorMessage) => {
    const onSubmit = vi.fn<(values: InvoiceFormValues) => void>()

    render(
      <MantineProvider>
        <InvoiceForm
          initialValues={{
            number: 'INV-1',
            customerId: 'customer-1',
            amount: 100,
            issueDate: '2026-10-10',
            dueDate: '2026-10-20',
            status: 'draft',
          }}
          onSubmit={onSubmit}
        />
      </MantineProvider>,
    )

    fireEvent.change(screen.getByLabelText(label), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(errorMessage)).toBeTruthy()
    expect(onSubmit).not.toHaveBeenCalled()
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('')
  })
})
