import { useCallback } from 'react'
import { useAuthStore, permissionsFor } from '@/stores/authStore'
import { useLogout } from './queries'

/**
 * Текущая сессия и права. Источник правды — authStore (zustand),
 * поэтому провайдер над деревом больше не нужен.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const { mutate: runLogout } = useLogout()

  const logout = useCallback(() => runLogout(), [runLogout])

  return {
    user,
    logout,
    isAuthenticated: !!user,
    ...permissionsFor(user?.role),
  }
}
