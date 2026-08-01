import { Alert, Anchor, Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'

import { useUpdateCustomer } from '@/features/customers/api/mutations'
import { useCustomer } from '@/features/customers/api/queries'
import { CustomerForm } from '@/features/customers/components/CustomerForm'
import { CustomerStatusBadge } from '@/features/customers/components/CustomerStatusBadge'
import type { CustomerFormValues } from '@/features/customers/schemas/customer.schema'

export const Route = createFileRoute('/_authenticated/customers/$customerId')({
  component: CustomerDetailRoute,
})

function CustomerDetailRoute() {
  const { customerId } = Route.useParams()
  const [opened, { close, open }] = useDisclosure()
  const customerQuery = useCustomer(customerId)
  const updateCustomer = useUpdateCustomer()
  const customer = customerQuery.data

  const handleUpdate = async (values: CustomerFormValues) => {
    await updateCustomer.mutateAsync({ id: customerId, values })
    close()
  }

  if (customerQuery.isLoading) {
    return <Loader />
  }

  if (customerQuery.isError || customer === undefined) {
    return (
      <Alert color="red" variant="light">
        Failed to load customer.
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Anchor component={Link} to="/customers">
            Back to Customers
          </Anchor>
          <Title order={2}>{customer.name}</Title>
        </Stack>
        <Button onClick={open}>Edit</Button>
      </Group>

      <Card withBorder radius="sm" padding="lg">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Email</Text>
            <Text>{customer.email}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Phone</Text>
            <Text>{customer.phone}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Status</Text>
            <CustomerStatusBadge status={customer.status} />
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Created</Text>
            <Text>{format(new Date(customer.createdAt), 'MMM d, yyyy')}</Text>
          </Group>
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="Edit Customer">
        <CustomerForm
          initialValues={{
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            status: customer.status,
          }}
          isSubmitting={updateCustomer.isPending}
          onSubmit={handleUpdate}
        />
      </Modal>
    </Stack>
  )
}
