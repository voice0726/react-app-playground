import { ActionIcon, Group, Table, Text, TextInput, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons-react'
import {
  createColumnHelper,
  flexRender,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import { useMemo } from 'react'

import { DealStatusBadge } from '@/features/deals/components/DealStatusBadge'
import { ListPagination } from '@/components/ListPagination'
import { features } from '@/lib/tableFeatures'
import { type PaginatedResponse, toPageParam } from '@/lib/pagination'
import type { Deal } from '@/features/deals/types'

type DealTableProps = {
  page: PaginatedResponse<Deal>
  isUpdating: boolean
}

const columnHelper = createColumnHelper<typeof features, Deal>()

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
  columnHelper.accessor('title', {
    header: 'タイトル',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('customerId', {
    header: '顧客',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('amount', {
    header: '金額',
    cell: (info) => currencyFormatter.format(info.getValue()),
  }),
  columnHelper.accessor('status', {
    header: 'ステータス',
    cell: (info) => <DealStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: '作成日',
    cell: (info) => format(new Date(info.getValue()), 'yyyy/MM/dd'),
  }),
  columnHelper.display({
    id: 'actions',
    header: '操作',
    enableSorting: false,
    cell: ({ row }) => (
      <Group gap="xs" justify="flex-end">
        <Tooltip label="詳細を見る">
          <Link to="/deals/$dealId" params={{ dealId: row.original.id }}>
            <ActionIcon variant="subtle" aria-label={`${row.original.title} の詳細を見る`}>
              <IconEye size={16} />
            </ActionIcon>
          </Link>
        </Tooltip>
      </Group>
    ),
  }),
])

export function DealTable({ page, isUpdating }: DealTableProps) {
  const search = useSearch({ from: '/_authenticated/deals' })
  const navigate = useNavigate({ from: '/deals' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''

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
        search: (previous) => ({
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
      <TextInput
        label="検索"
        placeholder="タイトルで検索"
        value={globalFilter}
        onChange={(event) => {
          const { value } = event.currentTarget
          navigate({
            search: (previous) => ({ ...previous, q: value.length > 0 ? value : undefined, page: undefined }),
          })
        }}
      />
      <Table.ScrollContainer minWidth={900}>
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
                    案件が見つかりません。
                  </Text>
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
        onPageChange={(next) => navigate({ search: (previous) => ({ ...previous, page: toPageParam(next) }) })}
        onPageSizeChange={(pageSize) => navigate({ search: (previous) => ({ ...previous, pageSize, page: undefined }) })}
      />
    </>
  )
}
