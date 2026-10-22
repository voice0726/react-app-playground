import { useOrganization } from '@/lib/organization'
import {
  Box,
  Button,
  Group,
  LoadingOverlay,
  Pagination,
  Paper,
  Select,
  Stack,
  Table,
  Text,
} from '@mantine/core'
import { IconEdit, IconEye, IconPlus, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import { TicketActorInfo } from '@/features/tickets/components/detail/TicketActorInfo'
import { TicketStatusBadge } from '@/features/tickets/components/detail/TicketStatusBadge'
import type { Ticket } from '@/features/tickets/schemas/index'
import type { TicketsSearch } from '@/features/tickets/schemas/search'
import { formatDateTime } from '@/lib/date'

type TicketsListPanelProps = {
  items: Ticket[]
  total: number
  rangeLabel: string
  totalPages: number
  search: TicketsSearch
  isFetching: boolean
  isLoading: boolean
  hasError: boolean
  pageSizeOptions: { label: string; value: string }[]
  onCreate: () => void
  onView: (ticketId: number) => void
  onEdit: (ticketId: number) => void
  onDelete: (ticket: Pick<Ticket, 'id' | 'title'>) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onRetry: () => void
}

const TABLE_BODY_MIN_HEIGHT = 200

export function TicketsListPanel({
  items,
  total,
  rangeLabel,
  totalPages,
  search,
  isFetching,
  isLoading,
  hasError,
  pageSizeOptions,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onPageChange,
  onPageSizeChange,
  onRetry,
}: TicketsListPanelProps) {
  const { canEdit } = useOrganization()
  const headerRef = useRef<HTMLTableSectionElement | null>(null)
  const [headerHeight, setHeaderHeight] = useState(0)
  const isTableOverlayVisible = isLoading || isFetching

  useEffect(() => {
    const headerElement = headerRef.current

    if (!headerElement) {
      return
    }

    const updateHeaderHeight = () => {
      setHeaderHeight(headerElement.getBoundingClientRect().height)
    }

    updateHeaderHeight()

    const observer = new ResizeObserver(() => {
      updateHeaderHeight()
    })

    observer.observe(headerElement)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <Paper p="lg" shadow="sm">
      <Stack gap="md">
        <Group align="center" justify="space-between" wrap="wrap">
          <Text fw={600}>チケット一覧</Text>
          <Button disabled={!canEdit} leftSection={<IconPlus size={16} />} onClick={onCreate} variant="light">
            新規作成
          </Button>
        </Group>

        <Group justify="flex-end" wrap="wrap">
          <Group align="center" gap="sm" justify="flex-end">
            <Text c="dimmed" size="sm">
              total: {total}
            </Text>
            <Text c="dimmed" size="sm">
              表示件数
            </Text>
            <Select
              allowDeselect={false}
              aria-label="表示件数"
              data={pageSizeOptions}
              value={String(search.pageSize)}
              w={100}
              onChange={(value) => {
                if (!value) {
                  return
                }

                onPageSizeChange(Number(value))
              }}
            />
          </Group>
        </Group>

        <Box mih={TABLE_BODY_MIN_HEIGHT} pos="relative">
          <LoadingOverlay
            visible={isTableOverlayVisible}
            loaderProps={{
              'aria-label': isLoading ? '読み込み中' : '更新中',
              role: 'status',
              type: 'dots',
            }}
            overlayProps={{ backgroundOpacity: 0.2, blur: 1 }}
            style={{ top: headerHeight }}
          />

          <Table.ScrollContainer minWidth={960} type="native">
            <Table highlightOnHover striped withColumnBorders withTableBorder>
              <Table.Thead ref={headerRef}>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>タイトル</Table.Th>
                  <Table.Th>ステータス</Table.Th>
                  <Table.Th>担当者</Table.Th>
                  <Table.Th>作成者</Table.Th>
                  <Table.Th>更新者</Table.Th>
                  <Table.Th>作成日</Table.Th>
                  <Table.Th>更新日</Table.Th>
                  <Table.Th>操作</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {hasError ? (
                  <Table.Tr>
                    <Table.Td colSpan={9}>
                      <Stack align="center" gap="xs">
                        <Text c="red" ta="center">
                          チケット一覧の取得に失敗しました
                        </Text>
                        <Button size="xs" variant="light" onClick={onRetry}>
                          再試行
                        </Button>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ) : isLoading ? null : items.length > 0 ? (
                  items.map((ticket) => (
                    <Table.Tr key={ticket.id}>
                      <Table.Td>{ticket.id}</Table.Td>
                      <Table.Td>{ticket.title}</Table.Td>
                      <Table.Td>
                        <TicketStatusBadge status={ticket.status} />
                      </Table.Td>
                      <Table.Td>{ticket.assignee ?? '-'}</Table.Td>
                      <Table.Td>
                        <TicketActorInfo actor={ticket.createdBy} fallback="-" />
                      </Table.Td>
                      <Table.Td>
                        <TicketActorInfo actor={ticket.updatedBy} fallback="-" />
                      </Table.Td>
                      <Table.Td>{formatDateTime(ticket.createdAt)}</Table.Td>
                      <Table.Td>{formatDateTime(ticket.updatedAt)}</Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <Button
                            leftSection={<IconEye size={14} />}
                            onClick={() => {
                              onView(ticket.id)
                            }}
                            size="xs"
                            variant="light"
                          >
                            詳細
                          </Button>
                          <Button
                            disabled={!canEdit}
                            leftSection={<IconEdit size={14} />}
                            onClick={() => {
                              onEdit(ticket.id)
                            }}
                            size="xs"
                            variant="default"
                          >
                            編集
                          </Button>
                          <Button
                            color="red"
                            disabled={!canEdit}
                            leftSection={<IconTrash size={14} />}
                            onClick={() => {
                              onDelete({
                                id: ticket.id,
                                title: ticket.title,
                              })
                            }}
                            size="xs"
                            variant="subtle"
                          >
                            削除
                          </Button>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={9}>
                      <Text c="dimmed" ta="center">
                        表示できるチケットがありません
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Box>

        <Group justify="space-between" wrap="wrap">
          <Text c="dimmed" size="sm">
            {rangeLabel}
          </Text>
          <Pagination total={totalPages} value={search.page} withEdges onChange={onPageChange} />
        </Group>
      </Stack>
    </Paper>
  )
}
