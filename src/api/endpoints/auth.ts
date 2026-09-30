import { request } from '../client'
import type {
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
} from '../types'

/** POST /auth/login → пара токенов и профиль. */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return request<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  })
}

/**
 * POST /auth/logout → 204. Гасит присланный refresh: сессия на этом
 * устройстве больше не продлевается. Ранее выданный access доживает
 * свои минуты — отозвать сам JWT нельзя.
 */
export function logout(refresh: string): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST', body: { refresh } })
}

/** POST /auth/refresh → новая пара. Обычно вызывается транспортом сам. */
export function refresh(token: string): Promise<RefreshResponse> {
  return request<RefreshResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh: token },
  })
}

/** GET /auth/me → текущий пользователь. */
export function me(): Promise<MeResponse> {
  return request<MeResponse>('/auth/me')
}
