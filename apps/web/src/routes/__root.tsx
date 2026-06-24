import { MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import React from 'react'

import { queryClient } from '@/lib/queryClient'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const showDevtools = import.meta.env.DEV && import.meta.env.VITE_DISABLE_DEVTOOLS !== 'true'

  return (
    <MantineProvider>
      <ModalsProvider>
        <QueryClientProvider client={queryClient}>
          <Notifications />
          <Outlet />
          {showDevtools ? (
            <>
              <ReactQueryDevtools initialIsOpen={false} />
              <TanStackRouterDevtools />
            </>
          ) : null}
        </QueryClientProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}
