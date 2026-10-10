import { MantineProvider } from '@mantine/core'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/queryClient'
import { useSessionStore } from '@/lib/stores/session.store'
import { AppNav } from './AppNav'

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children?: ReactNode; to: string }) => <a {...props} href={to}>{children}</a>,
  useNavigate: () => navigate,
  useRouterState: () => '/dashboard',
}))

describe('アプリのログアウト', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn().mockReturnValue(false) })))
    navigate.mockClear()
    useSessionStore.getState().setSession({ id: 'u1', name: 'User', email: 'u@example.com' })
    queryClient.setQueryData(['private-data'], { value: 'private' })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('サーバーで削除できた後に状態とキャッシュを消してログイン画面へ戻る', async () => {
    let complete: ((value: Response) => void) | undefined
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => { complete = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    render(<MantineProvider><AppNav /></MantineProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'サインアウト' }))
    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(queryClient.getQueryData(['private-data'])).toBeDefined()
    expect(complete).toBeDefined()
    complete?.(new Response(null, { status: 204 }))
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }))
    expect(fetchMock).toHaveBeenCalledWith('/auth/logout', { method: 'POST' })
    expect(useSessionStore.getState().status).toBe('unauthenticated')
    expect(queryClient.getQueryData(['private-data'])).toBeUndefined()
  })

  it.each(['server', 'network'])('失敗時はログイン状態とキャッシュを維持する: %s', async (failure) => {
    const fetchMock = failure === 'server'
      ? vi.fn().mockResolvedValue(new Response(null, { status: 503 }))
      : vi.fn().mockRejectedValue(new TypeError('offline'))
    vi.stubGlobal('fetch', fetchMock)
    render(<MantineProvider><AppNav /></MantineProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'サインアウト' }))
    await screen.findByRole('alert')
    expect(useSessionStore.getState().status).toBe('authenticated')
    expect(queryClient.getQueryData(['private-data'])).toBeDefined()
    expect(navigate).not.toHaveBeenCalled()
  })
})
