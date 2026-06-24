import { Alert, Anchor, Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import React from 'react'

import { useUpdateDeal } from '@/features/deals/api/mutations'
import { useDealWithCustomer } from '@/features/deals/api/queries'
import { DealForm } from '@/features/deals/components/DealForm'
import { DealStatusBadge } from '@/features/deals/components/DealStatusBadge'
import type { DealFormValues } from '@/features/deals/schemas/deal.schema'

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export const Route = createFileRoute('/_authenticated/deals/$dealId')({
  component: DealDetailRoute,
})

function DealDetailRoute() {
  const { dealId } = Route.useParams()
  const [opened, { close, open }] = useDisclosure()
  const { customerQuery, dealQuery } = useDealWithCustomer(dealId)
  const updateDeal = useUpdateDeal()
  const deal = dealQuery.data
  const customer = customerQuery.data

  const handleUpdate = async (values: DealFormValues) => {
    await updateDeal.mutateAsync({ id: dealId, values })
    close()
  }

  if (dealQuery.isLoading) {
    return <Loader />
  }

  if (dealQuery.isError || deal === undefined) {
    return (
      <Alert color="red" variant="light">
        Failed to load deal.
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Anchor component={Link} to="/deals">
            Back to Deals
          </Anchor>
          <Title order={2}>{deal.title}</Title>
        </Stack>
        <Button onClick={open}>Edit</Button>
      </Group>

      <Card withBorder radius="sm" padding="lg">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Amount</Text>
            <Text>{currencyFormatter.format(deal.amount)}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Status</Text>
            <DealStatusBadge status={deal.status} />
          </Group>
          <Group justify="space-between">
            <Text fw={600}>Created</Text>
            <Text>{format(new Date(deal.createdAt), 'MMM d, yyyy')}</Text>
          </Group>
        </Stack>
      </Card>

      <Card withBorder radius="sm" padding="lg">
        <Stack>
          <Title order={3} size="h4">
            Customer
          </Title>
          {customerQuery.isLoading ? <Loader size="sm" /> : null}
          {customerQuery.isError ? (
            <Alert color="red" variant="light">
              Failed to load customer.
            </Alert>
          ) : null}
          {customer !== undefined ? (
            <>
              <Group justify="space-between">
                <Text fw={600}>Name</Text>
                <Text>{customer.name}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={600}>Email</Text>
                <Text>{customer.email}</Text>
              </Group>
              <Group justify="space-between">
                <Text fw={600}>Phone</Text>
                <Text>{customer.phone}</Text>
              </Group>
            </>
          ) : null}
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="Edit Deal">
        <DealForm
          initialValues={{
            title: deal.title,
            customerId: deal.customerId,
            amount: deal.amount,
            status: deal.status,
          }}
          isSubmitting={updateDeal.isPending}
          onSubmit={handleUpdate}
        />
      </Modal>
    </Stack>
  )
}
