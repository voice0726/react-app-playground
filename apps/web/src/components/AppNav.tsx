import { Button, NavLink, Stack } from '@mantine/core'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import React from 'react'

import { authClient } from '@/lib/auth'
import { useSessionStore } from '@/lib/stores/session.store'

const navItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Customers', to: '/customers' },
  { label: 'Deals', to: '/deals' },
  { label: 'Invoices', to: '/invoices' },
  { label: 'Tasks', to: '/tasks' },
] as const

export function AppNav() {
  const navigate = useNavigate()
  const location = useRouterState({ select: (state) => state.location.pathname })
  const clearSession = useSessionStore((state) => state.clearSession)

  const handleSignOut = async () => {
    await authClient.signOut()
    clearSession()
    await navigate({ to: '/login' })
  }

  return (
    <Stack justify="space-between" h="100%">
      <Stack gap={4}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            component={Link}
            to={item.to}
            label={item.label}
            active={location === item.to}
          />
        ))}
      </Stack>
      <Button variant="light" color="red" onClick={handleSignOut}>
        Sign out
      </Button>
    </Stack>
  )
}
