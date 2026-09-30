import { NAV } from '@/lib/nav.js'
import { useAuth } from '@/features/auth/useAuth'

/** Разделы, доступные роли текущего пользователя, в порядке меню. */
export function useNavItems() {
  const { user } = useAuth()
  return NAV.filter((n) => !n.hidden && n.roles.includes(user?.role))
}
