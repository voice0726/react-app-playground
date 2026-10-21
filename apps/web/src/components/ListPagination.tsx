import { Group, Pagination, Select, Text } from '@mantine/core'

import { isPageSize, PAGE_SIZE_OPTIONS, pageCount } from '@/lib/pagination'

type ListPaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const pageSizeOptions = PAGE_SIZE_OPTIONS.map((value) => ({ value: String(value), label: `${value} 件` }))

export function ListPagination({ page, pageSize, total, onPageChange, onPageSizeChange }: ListPaginationProps) {
  const totalPages = pageCount(total, pageSize)
  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total)
  const to = Math.min(page * pageSize, total)

  return (
    <Group justify="space-between" mt="md" wrap="wrap">
      <Group gap="sm">
        <Text c="dimmed" size="sm">
          {total} 件中 {from}〜{to} 件
        </Text>
        <Select
          allowDeselect={false}
          aria-label="表示件数"
          data={pageSizeOptions}
          value={String(pageSize)}
          w={100}
          onChange={(value) => {
            const next = Number(value)
            if (isPageSize(next)) onPageSizeChange(next)
          }}
        />
      </Group>
      <Pagination
        total={totalPages}
        value={Math.min(page, totalPages)}
        withEdges
        onChange={onPageChange}
        getControlProps={(control) => ({ 'aria-label': controlLabels[control] })}
        getItemProps={(item) => ({ 'aria-label': `${item} ページ目` })}
      />
    </Group>
  )
}

const controlLabels = {
  first: '最初のページ',
  previous: '前のページ',
  next: '次のページ',
  last: '最後のページ',
} as const
