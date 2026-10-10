import { Alert, Button, Stack } from '@mantine/core'
import { useState } from 'react'

import { useAdvanceInvoiceStatus } from '@/features/invoices/api/mutations'
import { getNextStatus, type InvoiceStatus } from '@/features/invoices/types'

type InvoiceStatusTransitionProps = {
  invoiceId: string
  status: InvoiceStatus
}

export function InvoiceStatusTransition({ invoiceId, status }: InvoiceStatusTransitionProps) {
  const advanceInvoiceStatus = useAdvanceInvoiceStatus()
  const [error, setError] = useState(false)
  const nextStatus = getNextStatus(status)

  if (nextStatus === null) {
    return null
  }

  const handleAdvance = async () => {
    setError(false)
    try {
      await advanceInvoiceStatus.mutateAsync({ id: invoiceId, nextStatus })
    } catch {
      setError(true)
    }
  }

  return (
    <Stack gap="xs">
      {error ? (
        <Alert color="red" variant="light">
          Failed to update invoice status. Please try again.
        </Alert>
      ) : null}
      <Button variant="light" loading={advanceInvoiceStatus.isPending} onClick={handleAdvance}>
        → {nextStatus}
      </Button>
    </Stack>
  )
}
