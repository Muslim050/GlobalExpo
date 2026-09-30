import { request } from '../client'
import type { Contract, ContractInput, PaymentStatus } from '../types'

/**
 * Договор — самостоятельный ресурс: у него свой адрес, не зависящий от
 * бренда. Заводятся и удаляются договоры внутри бренда
 * (`/advertisers/:id/contracts`, см. `endpoints/advertisers.ts`), а правятся
 * по своему адресу — им и пользуется раздел «Договоры».
 *
 * Список `GET /contracts` здесь не нужен: договор не знает своего бренда
 * (`advertiserId` в ответе нет), а на экране рядом с каждым договором стоит
 * карточка бренда. Поэтому договоры берутся из `GET /advertisers`, где они
 * приходят вложенными.
 */

/** PATCH /contracts/:id — условия договора: название, статус, файлы. */
export function update(id: number, input: ContractInput): Promise<Contract> {
  return request<Contract>(`/contracts/${id}`, {
    method: 'PATCH',
    body: input,
  })
}

/**
 * PATCH /contracts/:id/campaign-info — два поля рекламодателя: название
 * рекламной кампании и ролик (`creativeId` из загрузчика файлов).
 * Присланное сверх этого списка сервер игнорирует.
 */
export function saveCampaignInfo(
  id: number,
  input: { campaignName?: string; creativeId?: number | null },
): Promise<Contract> {
  return request<Contract>(`/contracts/${id}/campaign-info`, {
    method: 'PATCH',
    body: input,
  })
}

/** Правка сумм договора. Пустые поля сервер не трогает. */
export interface AmountsInput {
  budget?: string
  spent?: string
  /**
   * Дата поступления. В договоре не хранится: сервер оформляет им прирост
   * «Оплачено» — то есть новое поступление создаётся не отдельным запросом,
   * а увеличением `spent`.
   */
  paidAt?: string
}

/** PATCH /contracts/:id/amounts — сумма договора и оплаченное. */
export function updateAmounts(
  id: number,
  input: AmountsInput,
): Promise<Contract> {
  return request<Contract>(`/contracts/${id}/amounts`, {
    method: 'PATCH',
    body: input,
  })
}

/** Смена статуса оплаты за конкретный месяц договора. */
export interface PaymentStatusInput {
  status: Exclude<PaymentStatus, ''>
  /** Месяц договора: `2026-08`. */
  period: string
  changedAt: string
}

/** PUT /contracts/:id/payment-status */
export function setPaymentStatus(
  id: number,
  input: PaymentStatusInput,
): Promise<Contract> {
  return request<Contract>(`/contracts/${id}/payment-status`, {
    method: 'PUT',
    body: input,
  })
}

/** Поступление правится и удаляется внутри своего договора. */
export const payments = {
  /** PATCH /contracts/:id/payments/:paymentId — отдаёт весь договор. */
  update(
    contractId: number,
    paymentId: number,
    input: { amount?: string; paidAt?: string; comment?: string },
  ): Promise<Contract> {
    return request<Contract>(`/contracts/${contractId}/payments/${paymentId}`, {
      method: 'PATCH',
      body: input,
    })
  },
  /** DELETE /contracts/:id/payments/:paymentId — отдаёт весь договор. */
  remove(contractId: number, paymentId: number): Promise<Contract> {
    return request<Contract>(`/contracts/${contractId}/payments/${paymentId}`, {
      method: 'DELETE',
    })
  },
}
