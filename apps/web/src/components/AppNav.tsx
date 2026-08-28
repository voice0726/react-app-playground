import { Button, NavLink, Stack } from '@mantine/core'
import { Link, useRouterState } from '@tanstack/react-router'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
const navItems = [{ label: 'Dashboard', to: '/dashboard' }, { label: 'Customers', to: '/customers' }, { label: 'Deals', to: '/deals' }, { label: 'Invoices', to: '/invoices' }, { label: 'Tasks', to: '/tasks' }] as const
export function AppNav() { const location = useRouterState({ select: (state) => state.location.pathname }); const clearSession = useSessionStore((state) => state.clearSession); const handleSignOut = () => { clearSession(); queryClient.clear() }; return <Stack justify="space-between" h="100%"><Stack gap={4}>{navItems.map((item) => <NavLink key={item.to} component={Link} to={item.to} label={item.label} active={location === item.to} />)}</Stack><form method="post" action="/auth/logout?redirect=%2Flogin" onSubmit={handleSignOut}><Button type="submit" variant="light" color="red">Sign out</Button></form></Stack> }
