import { request } from '../client'
import type { StandPackage, StandPackageInput } from '../types'

/**
 * Каталог «Стенды»: стенды внутри категорий-пакетов Стандарт, VIP и
 * Platinum. Видят площадка и наблюдатель, правит только площадка.
 */

/** GET /packages — все стенды каталога по порядку заведения. */
export function list(): Promise<StandPackage[]> {
  return request<StandPackage[]>('/packages')
}

/**
 * POST /packages — новая подкатегория, например «Стандарт (сентябрь)»,
 * сразу с ценой, площадью, описанием, составом и фото.
 */
export function create(
  input: StandPackageInput & {
    category: StandPackage['category']
    name: string
  },
): Promise<StandPackage> {
  return request<StandPackage>('/packages', { method: 'POST', body: input })
}

/** DELETE /packages/:key — убрать стенд из каталога. */
export function remove(key: string): Promise<void> {
  return request<void>(`/packages/${key}`, { method: 'DELETE' })
}

/** PATCH /packages/:key — название, описание, площадь, цена, состав, фото. */
export function update(
  key: StandPackage['key'],
  input: StandPackageInput,
): Promise<StandPackage> {
  return request<StandPackage>(`/packages/${key}`, {
    method: 'PATCH',
    body: input,
  })
}
