import { useOrganization } from '@/lib/organization'
import {
  ActionIcon,
  Alert,
  Button,
  Center,
  Group,
  Loader,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core'
import { IconEye, IconTrash } from '@tabler/icons-react'
import {
  createColumnHelper,
  flexRender,
  type SortingState,
  useTable,
} from '@tanstack/react-table'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { format } from 'date-fns'
import { createContext, useContext, useMemo, useRef, useState } from 'react'

import { useDeleteCustomer } from '@/features/customers/api/mutations'
import { CustomerStatusBadge } from '@/features/customers/components/CustomerStatusBadge'
import { ListPagination } from '@/components/ListPagination'
import { features } from '@/lib/tableFeatures'
import { type PaginatedResponse, toPageParam } from '@/lib/pagination'
import type { Customer } from '@/types/customer.types'

type CustomerTableProps = {
  page: PaginatedResponse<Customer>
  isLoading: boolean
  isUpdating: boolean
  isError: boolean
}

const columnHelper = createColumnHelper<typeof features, Customer>()

type CustomerActionsProps = {
  customer: Customer
}

type CustomerActionsContextValue = {
  isDeleting: boolean
  onDelete: (customer: Customer) => void
}

const CustomerActionsContext = createContext<CustomerActionsContextValue | null>(null)

function CustomerActions({ customer }: CustomerActionsProps) {
  const { canEdit } = useOrganization()
  const actionContext = useContext(CustomerActionsContext)

  if (actionContext === null) {
    return null
  }

  return (
    <Group gap="xs" justify="flex-end">
      <Tooltip label="詳細を見る">
        <Link to="/customers/$customerId" params={{ customerId: customer.id }}>
          <ActionIcon variant="subtle" aria-label={`${customer.name} の詳細を見る`}>
            <IconEye size={16} />
          </ActionIcon>
        </Link>
      </Tooltip>
      <Tooltip label="顧客を削除">
        <ActionIcon
          color="red"
          variant="subtle"
          aria-label={`${customer.name} を削除`}
          disabled={!canEdit || actionContext.isDeleting} onClick={() => actionContext.onDelete(customer)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}

const columns = columnHelper.columns([
  columnHelper.accessor('name', {
    header: '名前',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('email', {
    header: 'メールアドレス',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('phone', {
    header: '電話番号',
    cell: (info) => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'ステータス',
    cell: (info) => <CustomerStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: '作成日',
    cell: (info) => format(new Date(info.getValue()), 'yyyy/MM/dd'),
  }),
  columnHelper.display({
    id: 'actions',
    header: '操作',
    enableSorting: false,
    cell: ({ row }) => <CustomerActions customer={row.original} />,
  }),
])

function toSortingState(sort?: string, order?: 'asc' | 'desc'): SortingState {
  if (sort === undefined || order === undefined) {
    return []
  }

  return [{ id: sort, desc: order === 'desc' }]
}

export function CustomerTable({ page, isLoading, isUpdating, isError }: CustomerTableProps) {
  const { canEdit } = useOrganization()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [displayedCustomerName, setDisplayedCustomerName] = useState<string | null>(null)
  const deleteCustomer = useDeleteCustomer()
  const deleteInFlight = useRef(false)
  const search = useSearch({ from: '/_authenticated/customers' })
  const navigate = useNavigate({ from: '/customers' })
  const sorting = useMemo(
    () => toSortingState(search.sort, search.order),
    [search.sort, search.order],
  )
  const globalFilter = search.q ?? ''
  const isDeletePending = deleteCustomer.isPending
  const resetDelete = deleteCustomer.reset
  const customerActionsContext = useMemo(
    () => ({
      isDeleting: isDeletePending,
      onDelete: (customer: Customer) => {
        if (isDeletePending || deleteInFlight.current) {
          return
        }

        resetDelete()
        setDisplayedCustomerName(customer.name)
        setSelectedCustomer(customer)
      },
    }),
    [isDeletePending, resetDelete],
  )

  const handleCloseDelete = () => {
    if (deleteCustomer.isPending || deleteInFlight.current) {
      return
    }

    setSelectedCustomer(null)
    deleteCustomer.reset()
  }

  const handleConfirmDelete = async () => {
    if (selectedCustomer === null || deleteCustomer.isPending || deleteInFlight.current) {
      return
    }

    deleteInFlight.current = true
    try {
      await deleteCustomer.mutateAsync(selectedCustomer.id)
      setSelectedCustomer(null)
    } catch {
      return
    } finally {
      deleteInFlight.current = false
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
        placeholder="名前・メールアドレス・電話番号で検索"
        value={globalFilter}
        onChange={(event) => {
          const { value } = event.currentTarget
          navigate({
            search: (previous) => ({ ...previous, q: value.length > 0 ? value : undefined, page: undefined }),
          })
        }}
      />
      <CustomerActionsContext.Provider value={customerActionsContext}>
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
                    {isError ? (
                      <Text c="red" ta="center" role="alert">
                        顧客を読み込めませんでした。
                      </Text>
                    ) : isLoading ? (
                      <Center>
                        <Loader size="sm" role="status" aria-label="読み込み中" />
                      </Center>
                    ) : (
                      <Text c="dimmed" ta="center">
                        顧客が見つかりません。
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </CustomerActionsContext.Provider>
      <ListPagination
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        onPageChange={(next) => navigate({ search: (previous) => ({ ...previous, page: toPageParam(next) }) })}
        onPageSizeChange={(pageSize) => navigate({ search: (previous) => ({ ...previous, pageSize, page: undefined }) })}
      />
      <Modal
        opened={selectedCustomer !== null}
        onClose={handleCloseDelete}
        onExitTransitionEnd={() => {
          if (selectedCustomer === null) {
            setDisplayedCustomerName(null)
          }
        }}
        title="顧客を削除しますか？"
        closeOnClickOutside={!deleteCustomer.isPending}
        closeOnEscape={!deleteCustomer.isPending}
        withCloseButton={!deleteCustomer.isPending}
      >
        <Stack>
          <Text>{displayedCustomerName} を削除します。この操作は取り消せません。</Text>
          {deleteCustomer.isError ? (
            <Alert color="red" role="alert">
              顧客を削除できませんでした。もう一度お試しください。
            </Alert>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" disabled={deleteCustomer.isPending} onClick={handleCloseDelete}>
              キャンセル
            </Button>
            <Button
              color="red"
              disabled={!canEdit || deleteCustomer.isPending}
              loading={deleteCustomer.isPending} onClick={() => void handleConfirmDelete()}
            >
              削除する
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}
