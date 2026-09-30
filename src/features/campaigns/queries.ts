import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as campaignsApi from '@/api/endpoints/campaigns'
import { PAGE_SIZE, fetchAllPages } from '@/lib/paginate'
import type { Campaign, CampaignInput } from '@/api/types'

export const campaignKeys = {
  all: ['campaigns'] as const,
  list: () => [...campaignKeys.all, 'list'] as const,
}

/**
 * Все кампании, доступные пользователю. Рекламодателю сервер сам отдаёт
 * только его — фильтровать на клиенте нечего.
 *
 * Экран показывает список целиком: ищет, считает по месяцам и по договорам
 * локально, поэтому страницы дочитываются сразу. Когда кампаний станет
 * заметно больше сотни, это место превратится в useInfiniteQuery.
 */
export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.list(),
    queryFn: (): Promise<Campaign[]> =>
      fetchAllPages((cursor) =>
        campaignsApi.list({ cursor, limit: PAGE_SIZE }),
      ),
  })
}

export interface SaveCampaignInput {
  /** Пусто — заводим заявку. */
  id?: number
  campaign: CampaignInput
}

/**
 * Сохранение кампании. Заявку заводит рекламодатель (бренд и статус сервер
 * ставит сам), правит её дальше площадка.
 */
export function useSaveCampaign() {
  const client = useQueryClient()

  return useMutation({
    mutationFn: ({ id, campaign }: SaveCampaignInput) =>
      id ? campaignsApi.update(id, campaign) : campaignsApi.create(campaign),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: campaignKeys.all })
    },
  })
}
