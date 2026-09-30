import { useCampaigns } from '@/features/campaigns/queries'

/**
 * Кампании, видимые текущему пользователю: выборку по бренду делает сервер,
 * поэтому здесь остался только запрос. Возвращается результат react-query —
 * экраны показывают по нему загрузку и ошибку.
 *
 * Прежняя версия читала мок-базу и резала список сама:
 *
 * export function useScopedCampaigns() {
 *   const { user } = useAuth()
 *   const { campaigns } = useData()
 *   return useMemo(() => {
 *     if (user?.role === 'advertiser') {
 *       return campaigns.filter((c) => c.advertiserId === user.advertiserId)
 *     }
 *     return campaigns
 *   }, [campaigns, user])
 * }
 */
export function useScopedCampaigns() {
  return useCampaigns()
}
