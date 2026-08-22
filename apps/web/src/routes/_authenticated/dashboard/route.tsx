import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { useCustomers } from '@/features/customers/api/queries'
import { useDeals } from '@/features/deals/api/queries'
import { useInvoices } from '@/features/invoices/api/queries'
import { useTasks } from '@/features/tasks/api/queries'

type SummaryItem = {
  label: string
  value: number
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardRoute,
})

function DashboardRoute() {
  const customersQuery = useCustomers()
  const dealsQuery = useDeals()
  const invoicesQuery = useInvoices()
  const tasksQuery = useTasks()

  const summaryItems: SummaryItem[] = [
    { label: 'Customers', value: customersQuery.data?.length ?? 0 },
    { label: 'Deals', value: dealsQuery.data?.length ?? 0 },
    { label: 'Invoices', value: invoicesQuery.data?.length ?? 0 },
    { label: 'Tasks', value: tasksQuery.data?.length ?? 0 },
  ]

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed">A quick snapshot of the current demo data.</Text>
        </Stack>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {summaryItems.map((item) => (
          <Card key={item.label} withBorder radius="sm" padding="lg">
            <Stack gap={4}>
              <Text c="dimmed" size="sm">
                {item.label}
              </Text>
              <Title order={3}>{item.value}</Title>
            </Stack>
          </Card>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
