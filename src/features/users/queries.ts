import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as usersApi from '@/api/endpoints/users'
import { PAGE_SIZE, fetchAllPages } from '@/lib/paginate'
import type { ManagedUser, ManagedUserInput } from '@/api/types'

export const userKeys = {
  all: ['users'] as const,
  list: () => [...userKeys.all, 'list'] as const,
}

/**
 * Все пользователи списком. Их немного — по одному-два на бренд, — поэтому
 * страницы дочитываются сразу, а поиск и фильтр по роли работают на клиенте.
 */
export function useUsers() {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: (): Promise<ManagedUser[]> =>
      fetchAllPages((cursor) => usersApi.list({ cursor, limit: PAGE_SIZE })),
  })
}

export interface SaveUserInput {
  /** Пусто — заводим нового. */
  id?: number
  user: ManagedUserInput
}

/** Сохранение пользователя: новый заводится, существующий правится. */
export function useSaveUser() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, user }: SaveUserInput) =>
      id ? usersApi.update(id, user) : usersApi.create(user),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}

export function useDeleteUser() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: userKeys.all })
    },
  })
}
