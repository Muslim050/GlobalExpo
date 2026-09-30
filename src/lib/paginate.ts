import type { Paginated } from '@/api/types'

/** Сколько страниц готовы забрать за раз — страховка от бесконечного цикла. */
const MAX_PAGES = 20
export const PAGE_SIZE = 100

/**
 * Дочитывает курсорную выдачу до конца и отдаёт всё одним массивом.
 * Подходит для экранов, которые показывают список целиком и фильтруют
 * его локально; для длинных лент нужен useInfiniteQuery.
 */
export async function fetchAllPages<T>(
  loadPage: (cursor: string | null | undefined) => Promise<Paginated<T>>,
): Promise<T[]> {
  const items: T[] = []
  let cursor: string | null | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const chunk = await loadPage(cursor)
    items.push(...chunk.items)
    cursor = chunk.nextCursor
    if (!cursor) break
  }

  return items
}
