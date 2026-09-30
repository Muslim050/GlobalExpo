import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as advertisersApi from '@/api/endpoints/advertisers'
import { useAuth } from '@/features/auth/useAuth'
import { PAGE_SIZE, fetchAllPages } from '@/lib/paginate'
import type {
  Advertiser,
  AdvertiserInput,
  AdvertiserStatus,
  Contract,
  ContractInput,
} from '@/api/types'

export const advertiserKeys = {
  all: ['advertisers'] as const,
  list: () => [...advertiserKeys.all, 'list'] as const,
  card: (id: number) => [...advertiserKeys.all, 'card', id] as const,
}

/**
 * Все бренды списком. Экран показывает карточки целиком и ищет по ним
 * локально, поэтому страницы дочитываются сразу. Когда брендов станет
 * заметно больше сотни, это место превратится в useInfiniteQuery.
 */
export function useAdvertisers({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: advertiserKeys.list(),
    queryFn: (): Promise<Advertiser[]> =>
      fetchAllPages((cursor) =>
        advertisersApi.list({ cursor, limit: PAGE_SIZE }),
      ),
    enabled,
  })
}

/** Одна карточка бренда вместе с договорами. */
export function useAdvertiser(id: number | null | undefined) {
  return useQuery({
    queryKey: advertiserKeys.card(id ?? 0),
    queryFn: (): Promise<Advertiser> => advertisersApi.get(id as number),
    enabled: !!id,
  })
}

/**
 * Бренды, которые видит текущий пользователь. Площадке доступен весь список,
 * рекламодателю — только его собственный бренд: список брендов ему закрыт,
 * и запрос к нему вернул бы 403, то есть выкинул бы из сессии.
 */
export function useVisibleAdvertisers() {
  const { user, isAdvertiser } = useAuth()
  const list = useAdvertisers({ enabled: !isAdvertiser })
  const own = useAdvertiser(isAdvertiser ? user?.advertiserId : null)

  if (!isAdvertiser) return list
  return { ...own, data: own.data ? [own.data] : undefined }
}

/**
 * Сравнение значения из формы с тем, что пришло с сервера. Сервер отдаёт
 * `null` там, где форма держит пустую строку, — для нас это одно и то же.
 */
function isSameValue(before: unknown, after: unknown): boolean {
  if (Array.isArray(before) || Array.isArray(after)) {
    const left = Array.isArray(before) ? before : []
    const right = Array.isArray(after) ? after : []
    return (
      left.length === right.length &&
      left.every((item, index) => item === right[index])
    )
  }

  const left = before ?? ''
  const right = after ?? ''
  if (left === right) return true

  // Суммы приходят как decimal-строки: «890000.00» и «890000» — одно и то же.
  const leftNumber = Number(left)
  const rightNumber = Number(right)
  return (
    left !== '' &&
    right !== '' &&
    Number.isFinite(leftNumber) &&
    Number.isFinite(rightNumber) &&
    leftNumber === rightNumber
  )
}

/**
 * Команды загрузчика файлов: в самой сущности таких полей нет, сравнивать
 * их не с чем — раз ключ пришёл, файл заменили или убрали.
 */
const FILE_KEYS = ['fileId', 'creativeId', 'logoId']

/**
 * Правда ли, что отправлять нечего. Сравниваем только те поля, которые форма
 * собирается отправить: остальное она не трогает.
 */
function isUnchanged(
  before: Record<string, unknown> | undefined,
  fields: Record<string, unknown>,
): boolean {
  if (!before) return false
  if (FILE_KEYS.some((key) => key in fields)) return false
  return Object.entries(fields).every(([key, value]) =>
    isSameValue(before[key], value),
  )
}

/** Договор в форме: у нового id ещё локальный, строковый. */
export interface EditableContract extends ContractInput {
  id: number | string
}

/**
 * Приводит договоры бренда к тому, что собрано в форме. Внутри бренда они
 * доступны только на чтение, поэтому правим их поштучно: убранные удаляем,
 * новые создаём, изменённые обновляем. Нетронутые пропускаем — иначе правка
 * одного поля бренда тянула бы за собой запрос на каждый его договор.
 */
async function syncContracts(
  advertiserId: number,
  next: EditableContract[],
  previous: Contract[],
): Promise<boolean> {
  let changed = false
  const keptIds = new Set(
    next.map((contract) => contract.id).filter((id) => typeof id === 'number'),
  )
  const previousById = new Map(
    previous.map((contract) => [contract.id, contract]),
  )

  for (const contract of previous) {
    if (!keptIds.has(contract.id)) {
      await advertisersApi.contracts.remove(advertiserId, contract.id)
      changed = true
    }
  }

  for (const { id, ...fields } of next) {
    if (typeof id !== 'number') {
      await advertisersApi.contracts.create(advertiserId, fields)
      changed = true
      continue
    }
    const before = previousById.get(id) as unknown as Record<string, unknown>
    if (isUnchanged(before, fields)) continue
    await advertisersApi.contracts.update(advertiserId, id, fields)
    changed = true
  }

  return changed
}

export interface SaveAdvertiserInput {
  /** Пусто — создаём нового. */
  id?: number
  advertiser: AdvertiserInput
  contracts: EditableContract[]
  /** Бренд, каким он пришёл с сервера, — чтобы не слать правку без правок. */
  previousAdvertiser?: Advertiser | null
  /** Договоры, какими они пришли с сервера, — чтобы понять, что удалено. */
  previousContracts: Contract[]
}

/**
 * Что успело примениться до сбоя. Цепочка сохранения неатомарна: бренд,
 * его поля и каждый договор — отдельные запросы, транзакции у API нет.
 * Упало посередине — часть уже на сервере, и форма обязана об этом узнать,
 * иначе повтор заведёт второй бренд или дубли договоров.
 */
export interface PartialSave {
  advertiserId: number
  /** Карточка с сервера; `null` — перечитать не вышло, например нет сети. */
  advertiser: Advertiser | null
}

/** Что успело записаться, если сохранение сорвалось. */
export function partialSaveOf(error: unknown): PartialSave | null {
  if (!error || typeof error !== 'object') return null
  return (error as { partialSave?: PartialSave }).partialSave ?? null
}

/**
 * Сохранение карточки бренда целиком: сам бренд и его договоры. Договоры
 * идут отдельными запросами — так устроен API.
 */
export function useSaveAdvertiser() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      advertiser,
      contracts,
      previousAdvertiser,
      previousContracts,
    }: SaveAdvertiserInput) => {
      // Сам бренд трогаем, только если в его полях что-то поменялось:
      // правка одних договоров не должна дёргать карточку.
      const advertiserId = id ?? (await advertisersApi.create(advertiser)).id
      const advertiserChanged =
        !id ||
        !isUnchanged(
          previousAdvertiser as unknown as Record<string, unknown>,
          advertiser,
        )

      // Дальше бренд на сервере уже есть: либо он там был, либо мы его
      // только что завели. Всё, что упадёт ниже, оставит карточку
      // недописанной, поэтому ошибку отдаём вместе с её состоянием.
      try {
        if (id && advertiserChanged) {
          await advertisersApi.update(id, advertiser)
        }

        const contractsChanged = await syncContracts(
          advertiserId,
          contracts,
          previousContracts,
        )

        // Менять было нечего — не ходим на сервер и за карточкой.
        if (!advertiserChanged && !contractsChanged && previousAdvertiser) {
          return previousAdvertiser
        }

        // Возвращаем карточку с сервера: у созданных договоров появились
        // настоящие id, и форма должна узнать о них — иначе повторное
        // сохранение создало бы их заново.
        // await обязателен: без него отказ этого запроса прошёл бы мимо
        // catch ниже — функция уже вернула бы промис.
        return await advertisersApi.get(advertiserId)
      } catch (error) {
        const partialSave: PartialSave = {
          advertiserId,
          // Перечитать может и не выйти — сбой бывает сетевым. Тогда
          // форме останется хотя бы id, чтобы не завести бренд второй раз.
          advertiser: await advertisersApi.get(advertiserId).catch(() => null),
        }
        if (error && typeof error === 'object') {
          Object.assign(error, { partialSave })
        }
        throw error
      }
    },
    // Инвалидируем и после сбоя: цепочка неатомарна, часть правок могла
    // примениться, и кэш об этом уже не знает.
    onSettled: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

/** Статус бренда правится прямо из карточки — одним полем. */
export function useUpdateAdvertiserStatus() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: AdvertiserStatus }) =>
      advertisersApi.update(id, { status }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}

export function useDeleteAdvertiser() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => advertisersApi.remove(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: advertiserKeys.all })
    },
  })
}
