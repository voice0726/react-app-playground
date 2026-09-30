import { create } from 'zustand'
import type { SessionUser } from '@/lib/auth'
export type { SessionUser }
export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'unavailable'
type SessionState = { user: SessionUser | null; status: SessionStatus; isAuthenticated: boolean; setSession: (user: SessionUser) => void; setStatus: (status: SessionStatus) => void; clearSession: () => void }
export const useSessionStore = create<SessionState>((set) => ({ user: null, status: 'loading', isAuthenticated: false, setSession: (user) => set({ user, status: 'authenticated', isAuthenticated: true }), setStatus: (status) => set({ status, isAuthenticated: status === 'authenticated' }), clearSession: () => set({ user: null, status: 'unauthenticated', isAuthenticated: false }) }))
