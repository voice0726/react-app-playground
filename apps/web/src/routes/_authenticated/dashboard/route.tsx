import { useState } from 'react'
import { Alert, Button, Card, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { format } from 'date-fns'

import { useDashboard } from '@/features/dashboard/api/queries'
import { useOrganization } from '@/lib/organization'

type SummaryItem = {
  label: string
  value: number
}

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardRoute,
})

function DashboardRoute() {
  const { organization } = useOrganization()
  const [today] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const dashboardQuery = useDashboard(organization.id, today)
  const isLoading = dashboardQuery.isPending || dashboardQuery.isFetching
  const summary = dashboardQuery.data

  const summaryItems: SummaryItem[] = summary === undefined ? [] : [
    { label: '顧客', value: summary.customers },
    { label: '案件', value: summary.deals },
    { label: '請求書', value: summary.invoices },
    { label: 'タスク', value: summary.tasks },
  ]

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Stack gap={2}>
          <Title order={2}>ダッシュボード</Title>
          <Text c="dimmed">顧客・案件・請求・タスクの状況と、対応が必要な請求を確認します。</Text>
        </Stack>
      </Group>

      {isLoading ? <Loader aria-label="業務データを読み込み中" /> : null}
      {dashboardQuery.isError ? (
        <Alert color="red" title="業務データを取得できませんでした">
          <Button variant="light" onClick={() => { void dashboardQuery.refetch() }}>再読み込み</Button>
        </Alert>
      ) : null}
      {summary !== undefined && !isLoading ? (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
            {summaryItems.map((item) => (
              <Card key={item.label} withBorder radius="sm" padding="lg">
                <Text c="dimmed">{item.label}</Text>
                <Title order={3}>{item.value}</Title>
              </Card>
            ))}
          </SimpleGrid>

          <Title order={3}>請求の対応状況</Title>
          <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Card withBorder padding="lg">
              <Text c="dimmed">送付待ち</Text>
              <Title order={3}>{summary.invoiceSummary.draftCount} 件</Title>
            </Card>
            <Card withBorder padding="lg">
              <Text c="dimmed">未入金（送付済み）</Text>
              <Title order={3}>¥{summary.invoiceSummary.outstandingAmount.toLocaleString('ja-JP')}</Title>
            </Card>
            <Card withBorder padding="lg">
              <Text c="red">支払期限超過</Text>
              <Title order={3}>{summary.invoiceSummary.overdueCount} 件 · ¥{summary.invoiceSummary.overdueAmount.toLocaleString('ja-JP')}</Title>
            </Card>
          </SimpleGrid>
        </>
      ) : null}
    </Stack>
  )
}
