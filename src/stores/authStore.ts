import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setTokens } from '@/api/token'
import type { Role, TokenPair, User } from '@/api/types'

const STORAGE_KEY = 'globalexpo.auth.v1'

interface AuthState {
  tokens: TokenPair | null
  user: User | null
  setSession: (session: TokenPair & { user: User }) => void
  /** Транспорт обновил пару по refresh — пользователь тот же. */
  setTokens: (tokens: TokenPair) => void
  /** Свежий профиль из GET /auth/me. */
  setUser: (user: User) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      tokens: null,
      user: null,
      setSession: ({ access, refresh, user }) => {
        const pair = { access, refresh }
        setTokens(pair)
        set({ tokens: pair, user })
      },
      setTokens: (pair) => {
        setTokens(pair)
        set({ tokens: pair })
      },
      setUser: (user) => set({ user }),
      clearSession: () => {
        setTokens(null)
        set({ tokens: null, user: null })
      },
    }),
    {
      name: STORAGE_KEY,
      // Токены возвращаем в транспорт сразу после гидрации из localStorage —
      // иначе первый же запрос уйдёт без Authorization.
      onRehydrateStorage: () => (state) => {
        setTokens(state?.tokens ?? null)
      },
    },
  ),
)

/** Права, выведенные из роли. Держим здесь, чтобы не дублировать по экранам. */
export function permissionsFor(role: Role | undefined) {
  return {
    // viewer видит те же экраны, что и админ, но ничего не меняет.
    isAdmin: role === 'admin' || role === 'viewer',
    isAdvertiser: role === 'advertiser',
    isViewer: role === 'viewer',
    canEdit: !!role && role !== 'viewer',
  }
}
