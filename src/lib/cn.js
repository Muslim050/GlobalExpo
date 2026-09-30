import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Объединяет классы с корректным разрешением конфликтов Tailwind. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
