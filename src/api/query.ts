/** Параметры запроса: пустые значения в строку не попадают. */
export type QueryParams = Record<string, string | number | null | undefined>

/** Собирает `?a=1&b=2`; для пустого набора возвращает пустую строку. */
export function buildQuery(params: QueryParams): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
