import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import React from 'react'

import type { Deal, Invoice, Task } from '@/mocks/data/seed'
import type { Customer } from '@/types/customer.types'

type SummaryItem = {
  label: string
  value: number
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardRoute,
})

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`)
  }

  return (await response.json()) as T
}

function DashboardRoute() {
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchJson<Customer[]>('/api/customers'),
  })
  const dealsQuery = useQuery({
    queryKey: ['deals'],
    queryFn: () => fetchJson<Deal[]>('/api/deals'),
  })
  const invoicesQuery = useQuery({
    queryKey: ['invoices'],
    queryFn: () => fetchJson<Invoice[]>('/api/invoices'),
  })
  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => fetchJson<Task[]>('/api/tasks'),
  })

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
