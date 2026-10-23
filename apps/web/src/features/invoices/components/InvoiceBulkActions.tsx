import { Alert, Button, Group, Modal, Text } from '@mantine/core'

import type { useInvoiceBulkActions } from '@/features/invoices/hooks/useInvoiceBulkActions'

type InvoiceBulkActionsProps = {
  bulk: ReturnType<typeof useInvoiceBulkActions>
  canEdit: boolean
}

function InvoiceBulkConfirmation({ bulk }: Pick<InvoiceBulkActionsProps, 'bulk'>) {
  const { confirmation } = bulk
  return (
      <Modal opened={confirmation !== null} onClose={bulk.closeConfirmation} title="請求書の一括変更" centered>
        {confirmation ? (
          <>
            <Text>{confirmation.ids.length} 件を{confirmation.to === 'sent' ? '送付済み' : '入金済み'}に変更します。よろしいですか？</Text>
            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={bulk.closeConfirmation}>キャンセル</Button>
              <Button onClick={() => { void bulk.confirm() }}>変更する</Button>
            </Group>
          </>
        ) : null}
      </Modal>
  )
}

function InvoiceBulkResult({ result }: { result: InvoiceBulkActionsProps['bulk']['result'] }) {
  if (!result) return null
  return <Alert color={result.kind === 'error' ? 'red' : 'teal'} role={result.kind === 'error' ? 'alert' : 'status'}>{result.message}</Alert>
}

export function InvoiceBulkActions({ bulk, canEdit }: InvoiceBulkActionsProps) {
  const { transition } = bulk
  const statusLabel = transition?.to === 'sent' ? '送付済み' : '入金済み'
  return (
    <>
      <InvoiceBulkConfirmation bulk={bulk} />
      {bulk.selectedIds.size > 0 ? (
        <Group>
          <Text>{bulk.selectedIds.size} 件選択中</Text>
          <Button
            disabled={!canEdit || transition === undefined || bulk.isPending}
            loading={bulk.isPending}
            onClick={bulk.openConfirmation}
          >
            {transition === undefined ? '同じステータスの請求書を選択してください' : `${statusLabel}にする`}
          </Button>
        </Group>
      ) : null}
      <InvoiceBulkResult result={bulk.result} />
    </>
  )
}
