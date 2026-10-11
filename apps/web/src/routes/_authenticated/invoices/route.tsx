import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useRef, useState } from 'react'
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
  const invoicesQuery = useInvoices()

  if (pathname !== '/invoices') {
    return <Outlet />
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>請求書</Title>
        <InvoiceCreateModal />
      </Group>

      {invoicesQuery.isLoading ? <Loader /> : null}
      {invoicesQuery.isError ? (
        <Alert color="red" variant="light">
          請求書を読み込めませんでした。
        </Alert>
      ) : null}
      {invoicesQuery.data !== undefined ? <InvoiceTable invoices={invoicesQuery.data} /> : null}
    </Stack>
  )
}

function InvoiceCreateModal() {
  const [opened, { close, open }] = useDisclosure()
  const [createError, setCreateError] = useState(false)
  const [pending, setPending] = useState(false)
  const createFormGeneration = useRef(0)
  const createInvoice = useCreateInvoice()

  const handleCreate = async (values: InvoiceFormValues) => {
    const generation = createFormGeneration.current
    setCreateError(false)
    setPending(true)
    try {
      await createInvoice.mutateAsync(values)
      if (createFormGeneration.current === generation) {
        close()
      }
    } catch {
      if (createFormGeneration.current === generation) {
        setCreateError(true)
      }
    } finally {
      if (createFormGeneration.current === generation) {
        setPending(false)
      }
    }
  }

  const handleClose = () => {
    createFormGeneration.current += 1
    close()
    setPending(false)
  }

  return (
    <>
      <Button
        onClick={() => {
          createFormGeneration.current += 1
          setCreateError(false)
          setPending(false)
          open()
        }}
      >
        新規請求書
      </Button>
      <Modal opened={opened} onClose={handleClose} title="新規請求書">
        {createError ? (
          <Alert color="red" variant="light" mb="md">
            請求書を作成できませんでした。もう一度お試しください。
          </Alert>
        ) : null}
        <InvoiceForm isSubmitting={pending} onSubmit={handleCreate} />
      </Modal>
    </>
  )
}
