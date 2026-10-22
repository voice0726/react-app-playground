import { useOrganization } from '@/lib/organization'
import { Alert, Button, Group, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Navigate, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { useCreateCustomer } from '@/features/customers/api/mutations'
import { useCustomerPage } from '@/features/customers/api/queries'
import { CustomerForm } from '@/features/customers/components/CustomerForm'
import { CustomerTable } from '@/features/customers/components/CustomerTable'
import type { CustomerFormValues } from '@/features/customers/schemas/customer.schema'
import { createListSearchSchema } from '@/lib/listSearchSchema'
import { failedToRefresh, outOfRangeLastPage, pageToShow, toListRequest, toPageParam } from '@/lib/pagination'

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
  const { canEdit } = useOrganization()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close: closeModal, open: openModal }] = useDisclosure()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const modalSession = useRef(0)
  const search = Route.useSearch()
  const request = toListRequest(search)
  const customersQuery = useCustomerPage(request)
  const createCustomer = useCreateCustomer()

  const handleCreate = async (values: CustomerFormValues) => {
    const session = modalSession.current
    try {
      await createCustomer.mutateAsync(values)
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

  if (pathname !== '/customers') {
    return <Outlet />
  }

  const lastPage = outOfRangeLastPage(request.page, customersQuery)
  if (lastPage !== undefined) {
    return <Navigate to="/customers" search={{ ...search, page: toPageParam(lastPage) }} replace />
  }
  const page = pageToShow(request, customersQuery)

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>顧客</Title>
        <Button disabled={!canEdit} onClick={open}>新規顧客</Button>
      </Group>

      {failedToRefresh(customersQuery) ? (
        <Alert color="red" variant="light">
          顧客の一覧を更新できませんでした。前回読み込んだ内容を表示しています。
        </Alert>
      ) : null}
      <CustomerTable
        page={page}
        isLoading={customersQuery.isLoading}
        isUpdating={customersQuery.isPlaceholderData}
        isError={customersQuery.isError}
      />

      <Modal opened={canEdit && opened} onClose={close} title="新規顧客">
        <CustomerForm isSubmitting={createCustomer.isPending} onSubmit={handleCreate} submitError={submitError} />
      </Modal>
    </Stack>
  )
}
