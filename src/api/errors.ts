/**
 * Проблема в загруженном файле отчёта. `row` — номер строки в Excel, как её
 * видит пользователь; любое из трёх мест может быть `null`, если ошибка
 * про лист или про файл целиком.
 */
export interface ApiErrorDetail {
  sheet: string | null
  row: number | null
  column: string | null
  message: string
}

/**
 * Формат ошибки из §5 спеки:
 * `{ "error": { "code", "message", "fields": {}, "details"?: [] } }`
 */
export interface ApiErrorBody {
  code: string
  message: string
  /** Ошибки по полям формы: `{ login: 'Неверный логин' }`. */
  fields?: Record<string, string>
  /** Разбор файла отчёта — только у `report_invalid`, не больше 100 записей. */
  details?: ApiErrorDetail[]
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields: Record<string, string>
  readonly details: ApiErrorDetail[]

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fields = body.fields ?? {}
    this.details = body.details ?? []
  }

  /** 401/403 — сессия недействительна, пользователя надо разлогинить. */
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }
}

/** Сеть недоступна / запрос не дошёл. Отличаем от ответа сервера с ошибкой. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super('Не удалось связаться с сервером')
    this.name = 'NetworkError'
    this.cause = cause
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}
