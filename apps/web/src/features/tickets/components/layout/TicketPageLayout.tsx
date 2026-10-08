import { Group, Paper, Stack, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'

export function TicketPageLayout({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Stack gap="lg" maw={880}>
      <Group justify="space-between" align="flex-start">
        <div>
          <Text c="dimmed" fw={700} size="sm" tt="uppercase">
            Tickets
          </Text>
          <Title mt="xs" order={2}>
            {title}
          </Title>
          <Text c="dimmed" mt={6}>
            {description}
          </Text>
        </div>
        {actions}
      </Group>
      <Paper p="lg" radius="md" shadow="sm">
        {children}
      </Paper>
    </Stack>
  )
}
