import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { z } from 'zod'

import { useCreateInvoice } from '@/features/invoices/api/mutations'
import { useInvoices } from '@/features/invoices/api/queries'
import { InvoiceForm } from '@/features/invoices/components/InvoiceForm'
import { InvoiceTable } from '@/features/invoices/components/InvoiceTable'
import type { InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'

const invoiceSearchSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/invoices')({
  validateSearch: invoiceSearchSchema,
  component: InvoicesRoute,
})

function InvoicesRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close, open }] = useDisclosure()
  const invoicesQuery = useInvoices()
  const createInvoice = useCreateInvoice()

  const handleCreate = async (values: InvoiceFormValues) => {
    await createInvoice.mutateAsync(values)
    close()
  }

  if (pathname !== '/invoices') {
    return <Outlet />
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Invoices</Title>
        <Button onClick={open}>New Invoice</Button>
      </Group>

      {invoicesQuery.isLoading ? <Loader /> : null}
      {invoicesQuery.isError ? (
        <Alert color="red" variant="light">
          Failed to load invoices.
        </Alert>
      ) : null}
      {invoicesQuery.data !== undefined ? <InvoiceTable invoices={invoicesQuery.data} /> : null}

      <Modal opened={opened} onClose={close} title="New Invoice">
        <InvoiceForm isSubmitting={createInvoice.isPending} onSubmit={handleCreate} />
      </Modal>
    </Stack>
  )
}
