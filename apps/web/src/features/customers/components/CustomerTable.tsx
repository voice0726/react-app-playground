import { ActionIcon, Group, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { IconEye, IconTrash } from '@tabler/icons-react'
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

import { useDeleteCustomer } from '@/features/customers/api/mutations'
import { CustomerStatusBadge } from '@/features/customers/components/CustomerStatusBadge'
import type { Customer } from '@/types/customer.types'

type CustomerTableProps = {
  customers: Customer[]
}

const columnHelper = createColumnHelper<Customer>()

type CustomerActionsProps = {
  customer: Customer
}

function CustomerActions({ customer }: CustomerActionsProps) {
  const deleteCustomer = useDeleteCustomer()

  return (
    <Group gap="xs" justify="flex-end">
      <Tooltip label="View details">
        <Link to="/customers/$customerId" params={{ customerId: customer.id }}>
          <ActionIcon variant="subtle" aria-label={`View ${customer.name}`}>
            <IconEye size={16} />
          </ActionIcon>
        </Link>
      </Tooltip>
      <Tooltip label="Delete customer">
        <ActionIcon
          color="red"
          variant="subtle"
          aria-label={`Delete ${customer.name}`}
          loading={deleteCustomer.isPending}
          onClick={() => deleteCustomer.mutate(customer.id)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}

const columns = [
  columnHelper.accessor('name', {
    header: 'Name',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('phone', {
    header: 'Phone',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <CustomerStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => format(new Date(info.getValue()), 'MMM d, yyyy'),
  }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    enableSorting: false,
    cell: ({ row }) => <CustomerActions customer={row.original} />,
  }),
]

function toSortingState(sort?: string, order?: 'asc' | 'desc'): SortingState {
  if (sort === undefined || order === undefined) {
    return []
  }

  return [{ id: sort, desc: order === 'desc' }]
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const search = useSearch({ from: '/_authenticated/customers' })
  const navigate = useNavigate({ from: '/customers' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''

  const table = useReactTable({
    data: customers,
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
        placeholder="Search customers"
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
                    No customers found.
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
