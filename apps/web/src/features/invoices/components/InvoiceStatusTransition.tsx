import { useOrganization } from '@/lib/organization'
import { Alert, Button, Stack } from '@mantine/core'
import { useRef, useState } from 'react'

import { useAdvanceInvoiceStatus } from '@/features/invoices/api/mutations'
import { getNextStatus, invoiceStatusLabels, type InvoiceStatus } from '@/features/invoices/types'

type InvoiceStatusTransitionProps = {
  invoiceId: string
  status: InvoiceStatus
}

export function InvoiceStatusTransition({ invoiceId, status }: InvoiceStatusTransitionProps) {
  return (
    <InvoiceStatusTransitionContent
      key={JSON.stringify([invoiceId, status])}
      invoiceId={invoiceId}
      status={status}
    />
  )
}

function InvoiceStatusTransitionContent({ invoiceId, status }: InvoiceStatusTransitionProps) {
  const { canEdit } = useOrganization()
  const advanceInvoiceStatus = useAdvanceInvoiceStatus()
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)
  const requestGeneration = useRef(0)
  const nextStatus = getNextStatus(status)

  if (nextStatus === null) {
    return null
  }

  const handleAdvance = async () => {
    const generation = ++requestGeneration.current
    setError(false)
    setPending(true)
    try {
      await advanceInvoiceStatus.mutateAsync({ id: invoiceId, nextStatus })
    } catch {
      if (requestGeneration.current === generation) {
        setError(true)
      }
    } finally {
      if (requestGeneration.current === generation) {
        setPending(false)
      }
    }
  }

  return (
    <Stack gap="xs">
      {error ? (
        <Alert color="red" variant="light">
          請求書のステータスを更新できませんでした。もう一度お試しください。
        </Alert>
      ) : null}
      <Button
        disabled={!canEdit}
        variant="light"
        loading={pending}
        onClick={handleAdvance}
      >
        → {invoiceStatusLabels[nextStatus]}
      </Button>
    </Stack>
  )
}
