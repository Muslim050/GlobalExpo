import { request } from '../client'
import { buildQuery } from '../query'
import type { ManagedUser, ManagedUserInput, Paginated, Role } from '../types'

/** Раздел целиком доступен только роли admin — сервер это проверяет сам. */

export type ListParams = {
  q?: string
  role?: Role
  advertiserId?: number
  cursor?: string | null
  limit?: number
}

/** GET /users — одна страница выборки. */
export function list(params: ListParams = {}): Promise<Paginated<ManagedUser>> {
  return request<Paginated<ManagedUser>>(`/users${buildQuery(params)}`)
}

/** POST /users — пароль здесь обязателен. */
export function create(input: ManagedUserInput): Promise<ManagedUser> {
  return request<ManagedUser>('/users', { method: 'POST', body: input })
}

/** PATCH /users/:id */
export function update(
  id: number,
  input: ManagedUserInput,
): Promise<ManagedUser> {
  return request<ManagedUser>(`/users/${id}`, { method: 'PATCH', body: input })
}

/** DELETE /users/:id */
export function remove(id: number): Promise<void> {
  return request<void>(`/users/${id}`, { method: 'DELETE' })
}
