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
import React, { useMemo } from 'react'

import { DealStatusBadge } from '@/features/deals/components/DealStatusBadge'
import type { Deal } from '@/features/deals/types'

type DealTableProps = {
  deals: Deal[]
}

const columnHelper = createColumnHelper<Deal>()

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
  columnHelper.accessor('title', {
    header: 'Title',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('customerId', {
    header: 'Customer',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('amount', {
    header: 'Amount',
    cell: (info) => currencyFormatter.format(info.getValue()),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <DealStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy'),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => (
      <Group gap="xs" justify="flex-end">
        <Tooltip label="View details">
          <Link to="/deals/$dealId" params={{ dealId: row.original.id }}>
            <ActionIcon variant="subtle" aria-label={`View ${row.original.title}`}>
              <IconEye size={16} />
            </ActionIcon>
          </Link>
        </Tooltip>
      </Group>
    ),
  }),
]

export function DealTable({ deals }: DealTableProps) {
  const search = useSearch({ from: '/_authenticated/deals' })
  const navigate = useNavigate({ from: '/deals' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''

  const table = useReactTable({
    data: deals,
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
        placeholder="Search deals"
        value={globalFilter}
        onChange={(event) => table.setGlobalFilter(event.currentTarget.value)}
      />
      <Table.ScrollContainer minWidth={900}>
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
                    No deals found.
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
