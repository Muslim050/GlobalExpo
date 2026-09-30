import type { Advertiser } from '@/api/types'

/**
 * Логотип бренда для картинки. Загруженный файл приходит в `logoFile`, а
 * `logo` при этом остаётся пустым; у брендов, чей логотип лежит на чужом
 * хосте, наоборот — заполнен только `logo`. Поэтому смотреть надо в оба
 * поля, и загруженный файл главнее: его выбрали позже.
 */
export function advertiserLogo(
  advertiser: Pick<Advertiser, 'logo' | 'logoFile'> | null | undefined,
): string | null {
  return advertiser?.logoFile?.url ?? advertiser?.logo ?? null
}
