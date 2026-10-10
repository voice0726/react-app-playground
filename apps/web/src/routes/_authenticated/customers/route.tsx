import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { useCreateCustomer } from '@/features/customers/api/mutations'
import { useCustomers } from '@/features/customers/api/queries'
import { CustomerForm } from '@/features/customers/components/CustomerForm'
import { CustomerTable } from '@/features/customers/components/CustomerTable'
import type { CustomerFormValues } from '@/features/customers/schemas/customer.schema'
import { createListSearchSchema } from '@/lib/listSearchSchema'

const customerSearchSchema = createListSearchSchema([
  'name',
  'email',
  'phone',
  'status',
  'createdAt',
])

export const Route = createFileRoute('/_authenticated/customers')({
  validateSearch: customerSearchSchema,
  component: CustomersRoute,
})

function CustomersRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close: closeModal, open: openModal }] = useDisclosure()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const modalSession = useRef(0)
  const customersQuery = useCustomers()
  const createCustomer = useCreateCustomer()

  const handleCreate = async (values: CustomerFormValues) => {
    const session = modalSession.current
    try {
      await createCustomer.mutateAsync(values)
      if (session === modalSession.current) close()
    } catch {
      if (session === modalSession.current) setSubmitError('Failed to save customer. Please try again.')
    }
  }

  const open = () => {
    modalSession.current += 1
    setSubmitError(null)
    openModal()
  }
  const close = () => {
    modalSession.current += 1
    closeModal()
    setSubmitError(null)
  }

  if (pathname !== '/customers') {
    return <Outlet />
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Customers</Title>
        <Button onClick={open}>New Customer</Button>
      </Group>

      {customersQuery.isLoading ? <Loader /> : null}
      {customersQuery.isError ? (
        <Alert color="red" variant="light">
          Failed to load customers.
        </Alert>
      ) : null}
      {customersQuery.data !== undefined ? <CustomerTable customers={customersQuery.data} /> : null}

      <Modal opened={opened} onClose={close} title="New Customer">
        <CustomerForm isSubmitting={createCustomer.isPending} onSubmit={handleCreate} submitError={submitError} />
      </Modal>
    </Stack>
  )
}
