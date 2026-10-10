import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useRef, useState } from 'react'

import { useCreateDeal } from '@/features/deals/api/mutations'
import { useDeals } from '@/features/deals/api/queries'
import { DealForm } from '@/features/deals/components/DealForm'
import { DealTable } from '@/features/deals/components/DealTable'
import type { DealFormValues } from '@/features/deals/schemas/deal.schema'
import { listSearchSchema } from '@/lib/listSearchSchema'

export const Route = createFileRoute('/_authenticated/deals')({
  validateSearch: listSearchSchema,
  component: DealsRoute,
})

function DealsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close: closeModal, open: openModal }] = useDisclosure()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const modalSession = useRef(0)
  const dealsQuery = useDeals()
  const createDeal = useCreateDeal()

  const handleCreate = async (values: DealFormValues) => {
    const session = modalSession.current
    try {
      await createDeal.mutateAsync(values)
      if (session === modalSession.current) close()
    } catch {
      if (session === modalSession.current) setSubmitError('Failed to save deal. Please try again.')
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

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Deals</Title>
        <Button onClick={open}>New Deal</Button>
      </Group>

      {dealsQuery.isLoading ? <Loader /> : null}
      {dealsQuery.isError ? (
        <Alert color="red" variant="light">
          Failed to load deals.
        </Alert>
      ) : null}
      {dealsQuery.data !== undefined ? <DealTable deals={dealsQuery.data} /> : null}

      <Modal opened={opened} onClose={close} title="New Deal">
        <DealForm isSubmitting={createDeal.isPending} onSubmit={handleCreate} submitError={submitError} />
      </Modal>
    </Stack>
  )
}
