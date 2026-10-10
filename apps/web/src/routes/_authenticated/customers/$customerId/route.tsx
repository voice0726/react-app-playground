import { Alert, Anchor, Button, Card, Group, Loader, Modal, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Link, createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useRef, useState } from 'react'

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
  const [opened, { close: closeModal, open: openModal }] = useDisclosure()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const modalSession = useRef(0)
  const customerQuery = useCustomer(customerId)
  const updateCustomer = useUpdateCustomer()
  const customer = customerQuery.data

  const handleUpdate = async (values: CustomerFormValues) => {
    const session = modalSession.current
    try {
      await updateCustomer.mutateAsync({ id: customerId, values })
      if (session === modalSession.current) close()
    } catch {
      if (session === modalSession.current) setSubmitError('顧客を保存できませんでした。もう一度お試しください。')
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

  if (customerQuery.isLoading) {
    return <Loader />
  }

  if (customerQuery.isError || customer === undefined) {
    return (
      <Alert color="red" variant="light">
        顧客を読み込めませんでした。
      </Alert>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={4}>
          <Anchor component={Link} to="/customers">
            顧客一覧に戻る
          </Anchor>
          <Title order={2}>{customer.name}</Title>
        </Stack>
        <Button onClick={open}>編集</Button>
      </Group>

      <Card withBorder radius="sm" padding="lg">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>メールアドレス</Text>
            <Text>{customer.email}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>電話番号</Text>
            <Text>{customer.phone}</Text>
          </Group>
          <Group justify="space-between">
            <Text fw={600}>ステータス</Text>
            <CustomerStatusBadge status={customer.status} />
          </Group>
          <Group justify="space-between">
            <Text fw={600}>作成日</Text>
            <Text>{format(new Date(customer.createdAt), 'yyyy/MM/dd')}</Text>
          </Group>
        </Stack>
      </Card>

      <Modal opened={opened} onClose={close} title="顧客を編集">
        <CustomerForm
          initialValues={{
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            status: customer.status,
          }}
          isSubmitting={updateCustomer.isPending}
          onSubmit={handleUpdate}
          submitError={submitError}
        />
      </Modal>
    </Stack>
  )
}
