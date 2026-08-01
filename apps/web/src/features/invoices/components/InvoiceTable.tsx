import { ActionIcon, Group, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons-react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useMemo } from 'react'

import { InvoiceStatusBadge } from '@/features/invoices/components/InvoiceStatusBadge'
import type { Invoice } from '@/features/invoices/types'

type InvoiceTableProps = {
  invoices: Invoice[]
}

const columnHelper = createColumnHelper<Invoice>()

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

const columns = [
  columnHelper.accessor('number', {
    header: 'Invoice',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('customerId', {
    header: 'Customer ID',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    cell: (info) => currencyFormatter.format(info.getValue()),
  }),
  columnHelper.accessor('issueDate', {
    header: 'Issue date',
    cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy'),
  }),
  columnHelper.accessor('dueDate', {
    header: 'Due date',
    cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy'),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <InvoiceStatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => (
      <Group gap="xs" justify="flex-end">
        <Tooltip label="View details">
          <Link to="/invoices/$invoiceId" params={{ invoiceId: row.original.id }}>
            <ActionIcon variant="subtle" aria-label={`View ${row.original.number}`}>
              <IconEye size={16} />
            </ActionIcon>
          </Link>
        </Tooltip>
      </Group>
    ),
  }),
]

export function InvoiceTable({ invoices }: InvoiceTableProps) {
  const search = useSearch({ from: '/_authenticated/invoices' })
  const navigate = useNavigate({ from: '/invoices' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''

  const table = useReactTable({
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
        search: (previous) => ({
          ...previous,
          sort: next?.id,
          order: next === undefined ? undefined : next.desc ? 'desc' : 'asc',
        }),
      })
    },
    onGlobalFilterChange: (value) => {
      navigate({
        search: (previous) => ({
          ...previous,
          q: typeof value === 'string' && value.length > 0 ? value : undefined,
        }),
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <TextInput
        label="Search"
        placeholder="Search invoices"
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
                    No invoices found.
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
