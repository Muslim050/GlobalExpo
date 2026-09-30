import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as authApi from '@/api/endpoints/auth'
import type { LoginRequest } from '@/api/types'
import { useAuthStore } from '@/stores/authStore'

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
}

/**
 * Вход. Сессию кладём в authStore — он и есть источник правды о пользователе;
 * Query отвечает только за сам запрос и его состояния.
 */
export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)
  const client = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: ({ access, refresh, user }) => {
      setSession({ access, refresh, user })
      client.setQueryData(authKeys.me(), { user })
    },
  })
}

/**
 * Выход. Просим сервер погасить refresh, но локальную сессию чистим в любом
 * случае: даже если запрос не дошёл, на этом устройстве пользователь вышел.
 */
export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession)
  const client = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const refresh = useAuthStore.getState().tokens?.refresh
      if (refresh) await authApi.logout(refresh)
    },
    onSettled: () => {
      clearSession()
      client.clear()
    },
  })
}

/**
 * Текущий пользователь: GET /auth/me. Профиль, полученный при входе, мог
 * устареть — например, за время, пока вкладка была закрыта, — поэтому при
 * старте авторизованной части приложения перечитываем его с сервера и
 * кладём в authStore, откуда его берут шапка и сайдбар.
 *
 * Заодно это проверка живости сессии: если refresh погашен, транспорт
 * не сможет обновить токен и приложение разлогинится.
 */
export function useMe() {
  const hasSession = useAuthStore((s) => !!s.tokens)

  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const response = await authApi.me()
      useAuthStore.getState().setUser(response.user)
      return response
    },
    enabled: hasSession,
  })
}
