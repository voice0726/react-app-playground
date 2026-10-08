import { Button } from '@mantine/core'
import { useNavigate } from '@tanstack/react-router'
import type { TicketsSearch } from '@/features/tickets/schemas/search'

export function TicketsBackButton({ search }: { search: TicketsSearch }) {
  const navigate = useNavigate()

  return (
    <Button
      onClick={() => {
        void navigate({ to: '/tickets', search })
      }}
      variant="default"
    >
      一覧に戻る
    </Button>
  )
}
