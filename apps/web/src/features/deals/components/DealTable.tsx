import { Table, Text, TextInput } from '@mantine/core'
import { flexRender, type SortingState, useTable } from '@tanstack/react-table'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo } from 'react'

import { dealColumns } from '@/features/deals/components/dealColumns'
import type { Deal } from '@/features/deals/types'
import { features } from '@/lib/tableFeatures'

type DealTableProps = {
  deals: Deal[]
}

function toSortingState(sort?: string, order?: 'asc' | 'desc'): SortingState {
  if (sort === undefined || order === undefined) {
    return []
  }

  return [{ id: sort, desc: order === 'desc' }]
}

export function DealTable({ deals }: DealTableProps) {
  const search = useSearch({ from: '/_authenticated/deals' })
  const navigate = useNavigate({ from: '/deals' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''

  const table = useTable({
    features,
    data: deals,
    columns: dealColumns,
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
    globalFilterFn: 'includesString',
  })

  return (
    <>
      <TextInput
        label="検索"
        placeholder="案件を検索"
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
                <Table.Td colSpan={dealColumns.length}>
                  <Text c="dimmed" ta="center">
                    案件が見つかりません。
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
