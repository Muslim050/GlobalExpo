/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Адрес бэкенда. Пусто — свой origin через прокси. */
  readonly VITE_API_URL?: string
  /** `true` — ходить в настоящий API; иначе данные отдаёт мок из src/mock. */
  readonly VITE_USE_API?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
