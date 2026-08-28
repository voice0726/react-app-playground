import { AppShell, Burger, Group, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { AppNav } from '@/components/AppNav'
import { shouldRedirectToLogin } from '@/lib/auth'
import { useSessionStore } from '@/lib/stores/session.store'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const isAuthenticated = useSessionStore.getState().status === 'authenticated'

    if (!isAuthenticated && shouldRedirectToLogin(useSessionStore.getState().status)) {
      throw redirect({ to: '/login' })
    }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const [opened, { toggle }] = useDisclosure()
  const user = useSessionStore((state) => state.user)

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 260,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={1} size="h3">
              Playground CRM
            </Title>
          </Group>
          <Text c="dimmed" size="sm">
            {user?.name}
          </Text>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppNav />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
