import { Button, NavLink, Stack, Text } from '@mantine/core'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'

const navItems = [{ label: 'ダッシュボード', to: '/dashboard' }, { label: '顧客', to: '/customers' }, { label: '案件', to: '/deals' }, { label: '請求書', to: '/invoices' }, { label: 'タスク', to: '/tasks' }, { label: 'チケット', to: '/tickets' }] as const

export function AppNav() {
  const location = useRouterState({ select: (state) => state.location.pathname })
  const navigate = useNavigate()
  const clearSession = useSessionStore((state) => state.clearSession)
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const handleSignOut = async () => {
    setPending(true)
    setFailed(false)
    try {
      const response = await fetch('/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('サインアウトに失敗しました')
      clearSession()
      queryClient.clear()
      await navigate({ to: '/login' })
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }
  return <Stack justify="space-between" h="100%">
    <Stack gap={4}>{navItems.map((item) => <NavLink key={item.to} component={Link} to={item.to} label={item.label} active={location === item.to} />)}</Stack>
    <Stack gap="xs">
      {failed && <Text role="alert" c="red" size="sm">サインアウトできませんでした。もう一度お試しください。</Text>}
      <Button type="button" variant="light" color="red" loading={pending} onClick={handleSignOut}>サインアウト</Button>
    </Stack>
  </Stack>
}
