import { Alert, Button, Group, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'

type TicketRequestErrorProps = {
  title: string
  message: string
  onRetry?: () => void
  secondaryAction?: ReactNode
}

export function TicketRequestError({
  title,
  message,
  onRetry,
  secondaryAction,
}: TicketRequestErrorProps) {
  return (
    <Alert color="red" radius="md" title={title} variant="light">
      <Stack gap="md">
        <Text size="sm">{message}</Text>
        <Group>
          {onRetry ? (
            <Button color="red" onClick={onRetry} variant="light">
              再試行
            </Button>
          ) : null}
          {secondaryAction}
        </Group>
      </Stack>
    </Alert>
  )
}
