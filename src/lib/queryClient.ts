import { QueryClient } from '@tanstack/react-query'
import { isApiError } from '@/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 401/403 повторять бессмысленно — сессия недействительна.
      retry: (failureCount, error) => {
        if (isApiError(error) && error.isAuthError) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})
