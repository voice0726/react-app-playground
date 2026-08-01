import { Alert, Anchor, Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'

import { useUpdateInvoice } from '@/features/invoices/api/mutations'
import { useInvoice } from '@/features/invoices/api/queries'
import { InvoiceForm } from '@/features/invoices/components/InvoiceForm'
import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import { InvoiceStatusTransition } from '@/features/invoices/components/InvoiceStatusTransition'
import type { InvoiceFormValues } from '@/features/invoices/schemas/invoice.schema'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export const Route = createFileRoute('/_authenticated/invoices/$invoiceId')({
  component: InvoiceDetailRoute,
})

function InvoiceDetailRoute() {
  const { invoiceId } = Route.useParams()
  const [opened, { close, open }] = useDisclosure()
  const invoiceQuery = useInvoice(invoiceId)
  const updateInvoice = useUpdateInvoice()
  const invoice = invoiceQuery.data

  const handleUpdate = async (values: InvoiceFormValues) => {
    await updateInvoice.mutateAsync({ id: invoiceId, values })
    close()
  }

  if (invoiceQuery.isLoading) {
    return <Loader />
  }

  if (invoiceQuery.isError || invoice === undefined) {
    return (
      <Alert color="red" variant="light">
        Failed to load invoice.
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Anchor component={Link} to="/invoices">
            Back to Invoices
          </Anchor>
          <Title order={2}>{invoice.number}</Title>
        </Stack>
        <Group>
          <InvoiceStatusTransition invoiceId={invoice.id} status={invoice.status} />
          <Button onClick={open}>Edit</Button>
        </Group>
      </Group>

      <Card withBorder radius="sm" padding="lg">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Customer ID</Text>
            <Text>{invoice.customerId}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Amount</Text>
            <Text>{currencyFormatter.format(invoice.amount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Issue date</Text>
            <Text>{format(new Date(invoice.issueDate), 'MMM d, yyyy')}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Due date</Text>
            <Text>{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Status</Text>
            <InvoiceStatusBadge status={invoice.status} />
          </Group>
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="Edit Invoice">
        <InvoiceForm
          initialValues={{
            number: invoice.number,
            customerId: invoice.customerId,
            amount: invoice.amount,
            issueDate: invoice.issueDate,
            dueDate: invoice.dueDate,
            status: invoice.status,
          }}
          isSubmitting={updateInvoice.isPending}
          onSubmit={handleUpdate}
        />
      </Modal>
    </Stack>
  )
}
