import { Alert, Anchor, Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { useUpdateInvoice } from '@/features/invoices/api/mutations'
import { useInvoice } from '@/features/invoices/api/queries'
import { InvoiceForm } from '@/features/invoices/components/InvoiceForm'
import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import { InvoiceStatusTransition } from '@/features/invoices/components/InvoiceStatusTransition'
import { formatInvoiceDate } from '@/features/invoices/date'
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
  const [updateError, setUpdateError] = useState(false)
  const editFormGeneration = useRef(0)
  const invoiceQuery = useInvoice(invoiceId)
  const updateInvoice = useUpdateInvoice()
  const invoice = invoiceQuery.data

  const handleUpdate = async (values: InvoiceFormValues) => {
    const generation = editFormGeneration.current
    setUpdateError(false)
    try {
      await updateInvoice.mutateAsync({ id: invoiceId, values })
      if (editFormGeneration.current === generation) {
        close()
      }
    } catch {
      if (editFormGeneration.current === generation) {
        setUpdateError(true)
      }
    }
  }

  const handleClose = () => {
    editFormGeneration.current += 1
    close()
  }

  if (invoiceQuery.isLoading) {
    return <Loader />
  }

  if (invoiceQuery.isError || invoice === undefined) {
    return (
      <Alert color="red" variant="light">
        請求書を読み込めませんでした。
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Anchor component={Link} to="/invoices">
            請求書一覧に戻る
          </Anchor>
          <Title order={2}>{invoice.number}</Title>
        </Stack>
        <Group>
          <InvoiceStatusTransition invoiceId={invoice.id} status={invoice.status} />
          <Button
            onClick={() => {
              editFormGeneration.current += 1
              setUpdateError(false)
              open()
            }}
          >
            編集
          </Button>
        </Group>
      </Group>

      <Card withBorder radius="sm" padding="lg">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>顧客 ID</Text>
            <Text>{invoice.customerId}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>金額</Text>
            <Text>{currencyFormatter.format(invoice.amount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>発行日</Text>
            <Text>{formatInvoiceDate(invoice.issueDate, 'yyyy/MM/dd')}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>支払期日</Text>
            <Text>{formatInvoiceDate(invoice.dueDate, 'yyyy/MM/dd')}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>ステータス</Text>
            <InvoiceStatusBadge status={invoice.status} />
          </Group>
        </Stack>
      </Card>

      <Modal opened={opened} onClose={handleClose} title="請求書を編集">
        {updateError ? (
          <Alert color="red" variant="light" mb="md">
            請求書を更新できませんでした。もう一度お試しください。
          </Alert>
        ) : null}
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
