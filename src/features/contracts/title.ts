import type { Contract } from '@/api/types'

/**
 * Как договор называется в интерфейсе. Номера у договора на платформе нет —
 * его зовут по рекламной кампании, под которую он заключён.
 */
export function contractTitle(
  contract: Pick<Contract, 'campaignName'> | null | undefined,
): string {
  return contract?.campaignName?.trim() || 'Договор без названия'
}

/**
 * Внутренний ключ нового договора. Схема API требует `number` — по нему
 * кампания привязывается к договору, — но людям он не показывается,
 * поэтому генерируем его сами.
 */
export function newContractKey(): string {
  const stamp = Date.now().toString(36)
  const salt = Math.random().toString(36).slice(2, 6)
  return `GE-${stamp}-${salt}`.toUpperCase()
}
