import { Alert, Button, Group, Loader, Modal, Stack, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { z } from 'zod'

import { useCreateDeal } from '@/features/deals/api/mutations'
import { useDeals } from '@/features/deals/api/queries'
import { DealForm } from '@/features/deals/components/DealForm'
import { DealTable } from '@/features/deals/components/DealTable'
import type { DealFormValues } from '@/features/deals/schemas/deal.schema'

const dealSearchSchema = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  q: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/deals')({
  validateSearch: dealSearchSchema,
  component: DealsRoute,
})

function DealsRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [opened, { close, open }] = useDisclosure()
  const dealsQuery = useDeals()
  const createDeal = useCreateDeal()

  const handleCreate = async (values: DealFormValues) => {
    await createDeal.mutateAsync(values)
    close()
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
        <DealForm isSubmitting={createDeal.isPending} onSubmit={handleCreate} />
      </Modal>
    </Stack>
  )
}
