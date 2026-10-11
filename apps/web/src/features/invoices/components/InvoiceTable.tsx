import { ActionIcon, Group, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons-react'
import {
  createColumnHelper,
  flexRender,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'

import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import { formatInvoiceDate } from '@/features/invoices/date'
import { features } from "@/lib/tableFeatures"
import type { Invoice } from '@/features/invoices/types'

type InvoiceTableProps = {
  invoices: Invoice[]
}

const columnHelper = createColumnHelper<typeof features, Invoice>()

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

function toSortingState(sort?: string, order?: 'asc' | 'desc'): SortingState {
  if (sort === undefined || order === undefined) {
    return []
  }

  return [{ id: sort, desc: order === 'desc' }]
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

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const search = useSearch({ from: '/_authenticated/invoices' })
  const navigate = useNavigate({ from: '/invoices' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''

  const table = useTable({
    features,
    data: invoices,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: (updater) => {
      const nextSorting = typeof updater === 'function' ? updater(sorting) : updater
      const next = nextSorting[0]

      navigate({
        search: (previous: typeof search) => ({
          ...previous,
          sort: next?.id,
          order: next === undefined ? undefined : next.desc ? 'desc' : 'asc',
        }),
      })
    },
    onGlobalFilterChange: (value) => {
      navigate({
        search: (previous: typeof search) => ({
          ...previous,
          q: typeof value === 'string' && value.length > 0 ? value : undefined,
        }),
      })
    },
    globalFilterFn: "includesString",
  })

  return (
    <>
      <TextInput
        label="検索"
        placeholder="請求書を検索"
        value={globalFilter}
        onChange={(event) => table.setGlobalFilter(event.currentTarget.value)}
      />
      <Table.ScrollContainer minWidth={960}>
        <Table striped highlightOnHover withTableBorder mt="md">
          <Table.Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Table.Tr key={headerGroup.id}>
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
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Text c="dimmed" ta="center">
                    請求書が見つかりません。
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </>
  )
}
