import { AppShell, Box, Burger, Divider, Group, Stack, Text, Title } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

import { OrganizationWorkspace } from '@/components/OrganizationWorkspace'
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
    <OrganizationWorkspace key={user?.id} main={<Outlet />}>
      {({ switcher, roleLabel, content }) => (
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
            <Group h="100%" px="md" justify="space-between" wrap="nowrap">
              <Group wrap="nowrap">
                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                <Title order={1} size="h3">
                  Playground CRM
                </Title>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text c="dimmed" size="sm">
                  {user?.name}
                </Text>
                {roleLabel ? <Text c="dimmed" size="xs">権限: {roleLabel}</Text> : null}
              </Stack>
            </Group>
          </AppShell.Header>

          <AppShell.Navbar p="md">
            <Stack h="100%" gap="md">
              {switcher}
              {switcher ? <Divider /> : null}
              <Box flex={1}>
                <AppNav />
              </Box>
            </Stack>
          </AppShell.Navbar>

          <AppShell.Main>{content}</AppShell.Main>
        </AppShell>
      )}
    </OrganizationWorkspace>
  )
}
