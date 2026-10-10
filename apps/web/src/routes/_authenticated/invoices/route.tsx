import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useCreateInvoice } from '@/features/invoices/api/mutations'
import { useInvoices } from '@/features/invoices/api/queries'
import { InvoiceForm } from '@/features/invoices/components/InvoiceForm'
import { InvoiceTable } from '@/features/invoices/components/InvoiceTable'
import { invoiceSearchSchema } from '@/features/invoices/schemas/search'
import type { InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'

export const Route = createFileRoute('/_authenticated/invoices')({
  validateSearch: invoiceSearchSchema,
  component: InvoicesRoute,
})

function InvoicesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close, open }] = useDisclosure()
  const [createError, setCreateError] = useState(false)
  const invoicesQuery = useInvoices()
  const createInvoice = useCreateInvoice()

  const handleCreate = async (values: InvoiceFormValues) => {
    setCreateError(false)
    try {
      await createInvoice.mutateAsync(values)
      close()
    } catch {
      setCreateError(true)
    }
  }

  if (pathname !== '/invoices') {
    return <Outlet />
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Invoices</Title>
        <Button
          onClick={() => {
            setCreateError(false)
            open()
          }}
        >
          New Invoice
        </Button>
      </Group>

      {invoicesQuery.isLoading ? <Loader /> : null}
      {invoicesQuery.isError ? (
        <Alert color="red" variant="light">
          Failed to load invoices.
        </Alert>
      ) : null}
      {invoicesQuery.data !== undefined ? <InvoiceTable invoices={invoicesQuery.data} /> : null}

      <Modal opened={opened} onClose={close} title="New Invoice">
        {createError ? (
          <Alert color="red" variant="light" mb="md">
            Failed to create invoice. Please try again.
          </Alert>
        ) : null}
        <InvoiceForm isSubmitting={createInvoice.isPending} onSubmit={handleCreate} />
      </Modal>
    </Stack>
  )
}
