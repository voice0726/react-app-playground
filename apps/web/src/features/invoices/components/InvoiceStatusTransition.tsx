import { Alert, Button, Stack } from '@mantine/core'
import { useLayoutEffect, useRef, useState } from 'react'

import { useAdvanceInvoiceStatus } from '@/features/invoices/api/mutations'
import { getNextStatus, type InvoiceStatus } from '@/features/invoices/types'

type InvoiceStatusTransitionProps = {
  invoiceId: string
  status: InvoiceStatus
}

export function InvoiceStatusTransition({ invoiceId, status }: InvoiceStatusTransitionProps) {
  const advanceInvoiceStatus = useAdvanceInvoiceStatus()
  const [error, setError] = useState(false)
  const [pendingGeneration, setPendingGeneration] = useState<number | null>(null)
  const requestGeneration = useRef(0)
  const nextStatus = getNextStatus(status)

  useLayoutEffect(() => {
    requestGeneration.current += 1
    setError(false)
    setPendingGeneration(null)
  }, [invoiceId, status])

  if (nextStatus === null) {
    return null
  }

  const handleAdvance = async () => {
    const generation = ++requestGeneration.current
    setError(false)
    setPendingGeneration(generation)
    try {
      await advanceInvoiceStatus.mutateAsync({ id: invoiceId, nextStatus })
    } catch {
      if (requestGeneration.current === generation) {
        setError(true)
      }
    } finally {
      if (requestGeneration.current === generation) {
        setPendingGeneration(null)
      }
    }
  }

  return (
    <Stack gap="xs">
      {error ? (
        <Alert color="red" variant="light">
          Failed to update invoice status. Please try again.
        </Alert>
      ) : null}
      <Button
        variant="light"
        loading={pendingGeneration === requestGeneration.current}
        onClick={handleAdvance}
      >
        → {nextStatus}
      </Button>
    </Stack>
  )
}
