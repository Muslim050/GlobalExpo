import { request } from '../client'
import { buildQuery } from '../query'
import type {
  Campaign,
  CampaignInput,
  CampaignStatus,
  Paginated,
} from '../types'

export type ListParams = {
  advertiserId?: number
  contractNumber?: string
  status?: CampaignStatus
  q?: string
  cursor?: string | null
  limit?: number
}

/**
 * GET /campaigns — одна страница выборки. Рекламодателю сервер отдаёт
 * только его кампании, о чём бы клиент ни просил.
 */
export function list(params: ListParams = {}): Promise<Paginated<Campaign>> {
  return request<Paginated<Campaign>>(`/campaigns${buildQuery(params)}`)
}

/** GET /campaigns/:id */
export function get(id: number): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`)
}

/**
 * POST /campaigns — заявку заводит рекламодатель или площадка. У
 * рекламодателя бренд сервер берёт из сессии и ставит статус `sent`;
 * площадка передаёт `advertiserId`, и заявка сразу «Получен».
 */
export function create(input: CampaignInput): Promise<Campaign> {
  return request<Campaign>('/campaigns', { method: 'POST', body: input })
}

/**
 * PATCH /campaigns/:id/project — 3D проект стенда: `projectId` из загрузчика
 * файлов, `null` — убрать. Загружает только площадка.
 */
export function saveProject(
  id: number,
  projectId: number | null,
): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}/project`, {
    method: 'PATCH',
    body: { projectId },
  })
}

/**
 * PATCH /campaigns/:id/stand-report — фото и видео отчёт по завершённому
 * стенду: весь список id файлов из загрузчика. Новый файл — добавить его id
 * к списку, убрать — прислать список без него. Загружает только площадка.
 */
export function saveStandReport(
  id: number,
  standReportIds: number[],
): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}/stand-report`, {
    method: 'PATCH',
    body: { standReportIds },
  })
}

/** POST /campaigns/:id/project/send — площадка отправляет проект экспоненту. */
export function sendProject(id: number): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}/project/send`, { method: 'POST' })
}

/** POST /campaigns/:id/project/approve — экспонент подтверждает проект. */
export function approveProject(id: number): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}/project/approve`, {
    method: 'POST',
  })
}

/** POST /campaigns/:id/project/reject — экспонент возвращает на доработку. */
export function rejectProject(id: number, comment: string): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}/project/reject`, {
    method: 'POST',
    body: { comment },
  })
}

/** PATCH /campaigns/:id. Удаления у кампаний нет — так решено в спеке. */
export function update(id: number, input: CampaignInput): Promise<Campaign> {
  return request<Campaign>(`/campaigns/${id}`, {
    method: 'PATCH',
    body: input,
  })
}
