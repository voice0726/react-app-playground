import { create } from 'zustand'

export type SessionUser = {
  id: string
  name: string
  email: string
}

type SessionState = {
  user: SessionUser | null
  isAuthenticated: boolean
  setSession: (user: SessionUser) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  isAuthenticated: false,
  setSession: (user) => set({ user, isAuthenticated: true }),
  clearSession: () => set({ user: null, isAuthenticated: false }),
}))
