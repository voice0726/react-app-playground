import { Button } from '@mantine/core'

import { useAdvanceInvoiceStatus } from '@/features/invoices/api/mutations'
import { getNextStatus, type InvoiceStatus } from '@/features/invoices/types'

type InvoiceStatusTransitionProps = {
  invoiceId: string
  status: InvoiceStatus
}

export function InvoiceStatusTransition({ invoiceId, status }: InvoiceStatusTransitionProps) {
  const advanceInvoiceStatus = useAdvanceInvoiceStatus()
  const nextStatus = getNextStatus(status)

  if (nextStatus === null) {
    return null
  }

  return (
    <Button
      variant="light"
      loading={advanceInvoiceStatus.isPending}
      onClick={() => advanceInvoiceStatus.mutate({ id: invoiceId, nextStatus })}
    >
      → {nextStatus}
    </Button>
  )
}
