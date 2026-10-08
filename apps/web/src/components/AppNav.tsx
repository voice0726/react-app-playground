import { Button, NavLink, Stack, Text } from '@mantine/core'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'

const navItems = [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Customers', to: '/customers' }, { label: 'Deals', to: '/deals' }, { label: 'Invoices', to: '/invoices' }, { label: 'Tasks', to: '/tasks' }, { label: 'Tickets', to: '/tickets' }] as const

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
      if (!response.ok) throw new Error('Sign out failed')
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
      {failed && <Text role="alert" c="red" size="sm">Sign out failed. Please try again.</Text>}
      <Button type="button" variant="light" color="red" loading={pending} onClick={handleSignOut}>Sign out</Button>
    </Stack>
  </Stack>
}
