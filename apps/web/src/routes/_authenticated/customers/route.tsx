import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { z } from 'zod'

import { useCreateCustomer } from '@/features/customers/api/mutations'
import { useCustomers } from '@/features/customers/api/queries'
import { CustomerForm } from '@/features/customers/components/CustomerForm'
import { CustomerTable } from '@/features/customers/components/CustomerTable'
import type { CustomerFormValues } from '@/features/customers/schemas/customer.schema'

const customerSearchSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/customers')({
  validateSearch: customerSearchSchema,
  component: CustomersRoute,
})

function CustomersRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close, open }] = useDisclosure()
  const customersQuery = useCustomers()
  const createCustomer = useCreateCustomer()

  const handleCreate = async (values: CustomerFormValues) => {
    await createCustomer.mutateAsync(values)
    close()
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
        <CustomerForm isSubmitting={createCustomer.isPending} onSubmit={handleCreate} />
      </Modal>
    </Stack>
  )
}
