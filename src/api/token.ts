/**
 * Держатель пары JWT. Отдельный модуль, чтобы транспорт мог читать токены,
 * не завися от React и от стора. Значения сюда кладёт authStore при каждом
 * изменении сессии.
 */
import type { TokenPair } from './types'

let tokens: TokenPair | null = null

export function setTokens(next: TokenPair | null): void {
  tokens = next
}

export function getAccessToken(): string | null {
  return tokens?.access ?? null
}

export function getRefreshToken(): string | null {
  return tokens?.refresh ?? null
}
