import { ActionIcon, Alert, Button, Center, Checkbox, Group, Loader, Modal, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons-react'
import {
  createColumnHelper,
  flexRender,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useBulkInvoiceStatus } from '@/features/invoices/api/mutations'
import { ApiError } from '@/lib/apiClient'
import { useOrganization } from '@/lib/organization'

import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import { formatInvoiceDate } from '@/features/invoices/date'
import { ListPagination } from '@/components/ListPagination'
import { features } from '@/lib/tableFeatures'
import { type PaginatedResponse, toPageParam } from '@/lib/pagination'
import type { Invoice } from '@/features/invoices/types'

type InvoiceTableProps = {
  page: PaginatedResponse<Invoice>
  isLoading: boolean
  isUpdating: boolean
  isError: boolean
}

const columnHelper = createColumnHelper<typeof features, Invoice>()

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})
const emptySelection: string[] = []

function toSortingState(sort?: string, order?: 'asc' | 'desc'): SortingState {
  if (sort === undefined || order === undefined) {
    return []
  }

  return [{ id: sort, desc: order === 'desc' }]
}

function invoiceIdsFromError(body: unknown): string[] {
  if (body === null || typeof body !== 'object' || !('error' in body)) return []
  const error = body.error
  if (error === null || typeof error !== 'object' || !('details' in error)) return []
  const details = error.details
  if (details === null || typeof details !== 'object' || !('invoiceIds' in details)) return []
  return Array.isArray(details.invoiceIds)
    ? details.invoiceIds.filter((id): id is string => typeof id === 'string')
    : []
}

const columns = columnHelper.columns([
  columnHelper.accessor('number', {
    header: '請求書',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('customerId', {
    header: '顧客 ID',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('amount', {
    header: '金額',
    cell: (info) => currencyFormatter.format(info.getValue()),
  }),
  columnHelper.accessor('issueDate', {
    header: '発行日',
    cell: (info) => formatInvoiceDate(info.getValue(), 'yyyy/MM/dd'),
  }),
  columnHelper.accessor('dueDate', {
    header: '支払期日',
    cell: (info) => formatInvoiceDate(info.getValue(), 'yyyy/MM/dd'),
  }),
  columnHelper.accessor('status', {
    header: 'ステータス',
    cell: (info) => <InvoiceStatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: '操作',
    enableSorting: false,
    cell: ({ row }) => (
      <Group gap="xs" justify="flex-end">
        <Tooltip label="詳細を見る">
          <Link to="/invoices/$invoiceId" params={{ invoiceId: row.original.id }}>
            <ActionIcon variant="subtle" aria-label={`${row.original.number} の詳細を見る`}>
              <IconEye size={16} />
            </ActionIcon>
          </Link>
        </Tooltip>
      </Group>
    ),
  }),
])

export function InvoiceTable({ page, isLoading, isUpdating, isError }: InvoiceTableProps) {
  const { canEdit } = useOrganization()
  const search = useSearch({ from: '/_authenticated/invoices' })
  const navigate = useNavigate({ from: '/invoices' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''
  const viewKey = JSON.stringify([search.page, search.pageSize, search.sort, search.order, search.q, search.overdue])
  const [selectionState, setSelectionState] = useState<{
    viewKey: string
    ids: string[]
    result?: { kind: 'success' | 'error'; message: string }
  }>(() => ({ viewKey, ids: [] }))
  const [confirmation, setConfirmation] = useState<{
    viewKey: string
    ids: string[]
    from: 'draft' | 'sent'
    to: 'sent' | 'paid'
  } | null>(null)
  if (selectionState.viewKey !== viewKey) {
    setSelectionState({ viewKey, ids: [] })
    setConfirmation(null)
  }
  const selectedIds = selectionState.viewKey === viewKey ? selectionState.ids : emptySelection
  const bulkResult = selectionState.viewKey === viewKey ? selectionState.result : undefined
  const bulkStatus = useBulkInvoiceStatus()
  const updateSelectedIds = (update: (ids: string[]) => string[]) => {
    setSelectionState((previous) => ({
      viewKey,
      ids: update(previous.viewKey === viewKey ? previous.ids : []),
      result: previous.viewKey === viewKey ? previous.result : undefined,
    }))
  }
  const setBulkResult = (result: typeof bulkResult) => {
    setSelectionState((previous) => ({
      viewKey,
      ids: previous.viewKey === viewKey ? previous.ids : [],
      result,
    }))
  }
  const selectedRows = page.items.filter((invoice) => selectedIds.includes(invoice.id))
  const fromStatus = selectedRows.length > 0 && selectedRows.every((invoice) => invoice.status === 'draft')
    ? 'draft'
    : selectedRows.length > 0 && selectedRows.every((invoice) => invoice.status === 'sent')
      ? 'sent'
      : undefined
  const toStatus = fromStatus === 'draft' ? 'sent' : fromStatus === 'sent' ? 'paid' : undefined
  const statusLabel = toStatus === 'sent' ? '送付済み' : '入金済み'

  const runBulkStatus = async (ids: string[], from: 'draft' | 'sent', to: 'sent' | 'paid') => {
    setBulkResult(undefined)
    try {
      const result = await bulkStatus.mutateAsync({ ids, from, to })
      setSelectionState({
        viewKey,
        ids: [],
        result: { kind: 'success', message: `${result.items.length} 件を${to === 'sent' ? '送付済み' : '入金済み'}に変更しました。` },
      })
    } catch (error) {
      const errorIds = error instanceof ApiError ? invoiceIdsFromError(error.body) : []
      const message = error instanceof ApiError && error.status === 409
        ? '状態が変更されている請求書があります。最新の一覧を確認してください。'
        : error instanceof ApiError && error.status === 404
          ? '請求書が見つかりません。選択対象を確認してください。'
          : '一括変更できませんでした。請求書の状態を確認して、もう一度お試しください。'
      setBulkResult({
        kind: 'error',
        message: errorIds.length > 0 ? `${message} 対象の請求書 ID: ${errorIds.join(', ')}` : message,
      })
    }
  }

  const table = useTable({
    features,
    data: page.items,
    columns,
    state: {
      sorting,
    },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
      const next = nextSorting[0]

      navigate({
        search: (previous: typeof search) => ({
          ...previous,
          sort: next?.id,
          order: next === undefined ? undefined : next.desc ? 'desc' : 'asc',
          page: undefined,
        }),
      })
    },
  })

  return (
    <>
      <Modal
        opened={confirmation !== null}
        onClose={() => setConfirmation(null)}
        title="請求書の一括変更"
        centered
      >
        {confirmation ? (
          <>
            <Text>{confirmation.ids.length} 件を{confirmation.to === 'sent' ? '送付済み' : '入金済み'}に変更します。よろしいですか？</Text>
            <Group justify="flex-end" mt="lg">
              <Button variant="default" onClick={() => setConfirmation(null)}>キャンセル</Button>
              <Button
                onClick={() => {
                  const pending = confirmation
                  setConfirmation(null)
                  if (pending.viewKey !== viewKey || pending.ids.length !== selectedIds.length ||
                    !pending.ids.every((id, index) => id === selectedIds[index])) return
                  void runBulkStatus(pending.ids, pending.from, pending.to)
                }}
              >
                変更する
              </Button>
            </Group>
          </>
        ) : null}
      </Modal>
      <TextInput
        label="検索"
        placeholder="請求書番号で検索"
        value={globalFilter}
        onChange={(event) => {
          const { value } = event.currentTarget
          navigate({
            search: (previous: typeof search) => ({ ...previous, q: value.length > 0 ? value : undefined, page: undefined }),
          })
        }}
      />
      <Checkbox
        label="期限超過のみ表示"
        checked={search.overdue === true}
        onChange={(event) => {
          const overdue = event.target.checked ? true : undefined
          navigate({ search: (previous: typeof search) => ({ ...previous, overdue, page: undefined }) })
        }}
      />
      {selectedIds.length > 0 ? (
        <Group>
          <Text>{selectedIds.length} 件選択中</Text>
          <Button
            disabled={!canEdit || toStatus === undefined || bulkStatus.isPending}
            loading={bulkStatus.isPending}
            onClick={() => {
              if (fromStatus === undefined || toStatus === undefined) return
              setConfirmation({ viewKey, ids: [...selectedIds], from: fromStatus, to: toStatus })
            }}
          >
            {toStatus === undefined ? '同じステータスの請求書を選択してください' : `${statusLabel}にする`}
          </Button>
        </Group>
      ) : null}
      {bulkResult ? <Alert color={bulkResult.kind === 'error' ? 'red' : 'teal'} role={bulkResult.kind === 'error' ? 'alert' : 'status'}>{bulkResult.message}</Alert> : null}
      <Table.ScrollContainer minWidth={960}>
        <Table
          striped
          highlightOnHover
          withTableBorder
          mt="md"
          aria-busy={isUpdating}
          style={{ opacity: isUpdating ? 0.6 : 1 }}
        >
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
                <Table.Th scope="col">選択</Table.Th>
                {headerGroup.headers.map((header) => (
                  <Table.Th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <Text
                        component="button"
                        type="button"
                        fw={600}
                        onClick={header.column.getToggleSortingHandler()}
                        style={{
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          background: 'transparent',
                          border: 0,
                          padding: 0,
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                      </Text>
                    )}
                  </Table.Th>
                ))}
              </Table.Tr>
            ))}
          </Table.Thead>
          <Table.Tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Checkbox
                      aria-label={`${row.original.number} を選択`}
                      checked={selectedIds.includes(row.original.id)}
                      disabled={!canEdit || bulkStatus.isPending || isUpdating}
                      onChange={(event) => {
                        const checked = event.target.checked
                        updateSelectedIds((current) => checked
                          ? [...current, row.original.id]
                          : current.filter((id) => id !== row.original.id))
                      }}
                    />
                  </Table.Td>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={columns.length + 1}>
                  {isError ? (
                    <Text c="red" ta="center" role="alert">
                      請求書を読み込めませんでした。
                    </Text>
                  ) : isLoading ? (
                    <Center>
                      <Loader size="sm" role="status" aria-label="読み込み中" />
                    </Center>
                  ) : (
                    <Text c="dimmed" ta="center">
                      請求書が見つかりません。
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <ListPagination
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        onPageChange={(next) => navigate({ search: (previous: typeof search) => ({ ...previous, page: toPageParam(next) }) })}
        onPageSizeChange={(pageSize) => navigate({ search: (previous: typeof search) => ({ ...previous, pageSize, page: undefined }) })}
      />
    </>
  )
}
