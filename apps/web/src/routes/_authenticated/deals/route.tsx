import { useOrganization } from '@/lib/organization'
import { Alert, Button, Group, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Navigate, Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { useCreateDeal } from '@/features/deals/api/mutations'
import { useDealPage } from '@/features/deals/api/queries'
import { DealForm } from '@/features/deals/components/DealForm'
import { DealTable } from '@/features/deals/components/DealTable'
import type { DealFormValues } from '@/features/deals/schemas/deal.schema'
import { createListSearchSchema } from '@/lib/listSearchSchema'
import { failedToRefresh, outOfRangeLastPage, pageToShow, toListRequest, toPageParam } from '@/lib/pagination'

const dealSearchSchema = createListSearchSchema([
  'title',
  'customerId',
  'amount',
  'status',
  'createdAt',
])

export const Route = createFileRoute('/_authenticated/deals')({
  validateSearch: dealSearchSchema,
  component: DealsRoute,
})

function DealsRoute() {
  const { canEdit } = useOrganization()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close: closeModal, open: openModal }] = useDisclosure()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const modalSession = useRef(0)
  const search = Route.useSearch()
  const request = toListRequest(search)
  const dealsQuery = useDealPage(request)
  const createDeal = useCreateDeal()

  const handleCreate = async (values: DealFormValues) => {
    const session = modalSession.current
    try {
      await createDeal.mutateAsync(values)
      if (session === modalSession.current) close()
    } catch {
      if (session === modalSession.current) setSubmitError('案件を保存できませんでした。もう一度お試しください。')
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

  if (pathname !== '/deals') {
    return <Outlet />
  }

  const lastPage = outOfRangeLastPage(request.page, dealsQuery)
  if (lastPage !== undefined) {
    return <Navigate to="/deals" search={{ ...search, page: toPageParam(lastPage) }} replace />
  }
  const page = pageToShow(request, dealsQuery)

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>案件</Title>
        <Button disabled={!canEdit} onClick={open}>新規案件</Button>
      </Group>

      {failedToRefresh(dealsQuery) ? (
        <Alert color="red" variant="light">
          案件の一覧を更新できませんでした。前回読み込んだ内容を表示しています。
        </Alert>
      ) : null}
      <DealTable
        page={page}
        isLoading={dealsQuery.isLoading}
        isUpdating={dealsQuery.isPlaceholderData}
        isError={dealsQuery.isError}
      />

      <Modal opened={canEdit && opened} onClose={close} title="新規案件">
        <DealForm isSubmitting={createDeal.isPending} onSubmit={handleCreate} submitError={submitError} />
      </Modal>
    </Stack>
  )
}
