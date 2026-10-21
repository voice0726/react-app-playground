import { ActionIcon, Group, Tooltip } from '@mantine/core'
import { IconEye } from '@tabler/icons-react'
import { createColumnHelper } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { format } from 'date-fns'

import { DealStatusBadge } from '@/features/deals/components/DealStatusBadge'
import type { Deal } from '@/features/deals/types'
import { features } from '@/lib/tableFeatures'

const columnHelper = createColumnHelper<typeof features, Deal>()

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

export const dealColumns = columnHelper.columns([
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
