import { Stack, Text } from '@mantine/core'
import type { TicketActor } from '@/features/tickets/schemas/index'

type TicketActorInfoProps = {
  actor?: TicketActor | null
  fallback?: string
}

export function TicketActorInfo({ actor, fallback = '未設定' }: TicketActorInfoProps) {
  if (!actor) {
    return (
      <Text c="dimmed" size="sm">
        {fallback}
      </Text>
    )
  }

  return (
    <Stack gap={0}>
      <Text fw={500} size="sm">
        {actor.displayName}
      </Text>
      <Text c="dimmed" size="xs">
        {actor.email}
      </Text>
    </Stack>
  )
}
