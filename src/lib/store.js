import {
  ADVERTISERS,
  CAMPAIGNS,
  CONTRACTS_BY_ADVERTISER,
  REQUISITES_BY_ADVERTISER,
  buildSeed,
  paymentStatusesFor,
} from './seed.js'
import { uid } from './id.js'

// Юр. лица демо-брендов — добираем их в базах, созданных до появления поля.
const SEED_LEGAL_NAMES = new Map(ADVERTISERS.map((a) => [a.id, a.legalName]))
// Логотипы появились позже — в старых базах их тоже добираем из сида.
const SEED_LOGOS = new Map(ADVERTISERS.map((a) => [a.id, a.logo]))
// Демо-кампании по id: набор пополняется, и старые базы должны догонять его.
const SEED_CAMPAIGN_LIST = CAMPAIGNS
// Время создания демо-кампаний: в старых базах даты сохранены без времени.
const SEED_CREATED_AT = new Map(CAMPAIGNS.map((c) => [c.id, c.createdAt]))
// Дата загрузки ролика появилась позже — в старых базах её добираем из сида.
const SEED_CREATIVE_ADDED_AT = new Map(
  CAMPAIGNS.map((c) => [c.id, c.creativeAddedAt]),
)

// Ключ версионируем: при смене набора демо-кампаний старая база в localStorage
// заменяется свежим сидом.
const DB_KEY = 'globalexpo.db.v1'
// При смене версии демо-кампании догоняют сид: статусы воронки и условия
// договора. Заполненное руками не трогаем — дописываем только пустые поля.
const CAMPAIGN_STATUS_LAYOUT_VERSION = 6
// Раскладка демо-оплат по месяцам: при смене версии сидовые договоры
// догоняют новый набор статусов.
const CONTRACT_PAYMENT_LAYOUT_VERSION = 2
const DEMO_CAMPAIGN_STATUSES = Object.fromEntries(
  CAMPAIGNS.map((c) => [c.id, c.status]),
)
const SEED_CAMPAIGNS = new Map(CAMPAIGNS.map((c) => [c.id, c]))
const CONTRACT_FIELDS = [
  'contractNumber',
  'legalName',
  'package',
  'leagues',
  'contractStart',
  'contractEnd',
  'paymentDate',
]

/**
 * Дописываем условия договора из сида в пустые поля. Если кампания ссылается
 * на номер, которого нет среди договоров бренда, переносим её на сидовый —
 * иначе фильтр по договорам показывал бы пустоту.
 */
function fillContract(campaign, contractNumbers) {
  const seed = SEED_CAMPAIGNS.get(campaign.id)
  if (!seed) return campaign

  const known = contractNumbers.get(campaign.advertiserId)
  if (known?.size && !known.has(campaign.contractNumber)) {
    return { ...campaign, ...pickContractFields(seed) }
  }

  const patch = {}
  for (const field of CONTRACT_FIELDS) {
    const value = campaign[field]
    const isEmpty = Array.isArray(value) ? !value.length : !value
    if (isEmpty)
      patch[field] = Array.isArray(seed[field]) ? [...seed[field]] : seed[field]
  }
  return Object.keys(patch).length ? { ...campaign, ...patch } : campaign
}

function normalizeCampaignStatus(campaign) {
  if (campaign.status !== 'paused' && campaign.status !== 'draft') {
    return campaign
  }

  const today = new Date().toISOString().slice(0, 10)
  const status =
    campaign.endDate && campaign.endDate < today ? 'completed' : 'active'

  return { ...campaign, status }
}

const pickContractFields = (source) =>
  Object.fromEntries(
    CONTRACT_FIELDS.map((field) => [
      field,
      Array.isArray(source[field]) ? [...source[field]] : source[field],
    ]),
  )

/**
 * Статус оплаты теперь ставится на месяц договора. Записи старого формата —
 * без `period` — выбрасываем: в истории они выглядели как «Без месяца» и
 * ничего не красили. Договор при этом возвращается к статусу по умолчанию.
 */
function dropStatusesWithoutPeriod(contract) {
  const log = contract.paymentLog ?? []
  const kept = log.filter((entry) => entry.period)
  if (kept.length === log.length) return contract

  const next = { ...contract, paymentLog: kept }
  // Текущий статус мог быть выставлен удалённой записью — пересобираем его
  // по тому, что осталось.
  const last = kept.reduce(
    (newest, entry) =>
      !newest || entry.createdAt > newest.createdAt ? entry : newest,
    null,
  )
  if (last) {
    next.paymentStatus = last.status
    next.paymentStatusAt = last.createdAt
  } else {
    delete next.paymentStatus
    delete next.paymentStatusAt
  }
  return next
}

/**
 * Статусы оплаты по месяцам появились позже самих договоров — в базах,
 * созданных раньше, их нет. Добираем демо-набор из сида, но только когда
 * своих отметок ещё не ставили.
 */
function fillDemoStatuses(contract) {
  const hasOwn =
    Object.keys(contract.paymentStatusByPeriod ?? {}).length > 0 ||
    (contract.paymentLog ?? []).length > 0
  if (hasOwn) return contract

  const demo = paymentStatusesFor(contract.id)
  const last = demo.log[0]
  return {
    ...contract,
    paymentStatusByPeriod: demo.byPeriod,
    paymentLog: demo.log,
    paymentStatus: last.status,
    paymentStatusAt: last.createdAt,
  }
}

function normalizeDatabase(database) {
  const shouldUpdateDemoStatuses =
    database.campaignStatusLayoutVersion !== CAMPAIGN_STATUS_LAYOUT_VERSION
  const shouldUpdateContractPayments =
    database.contractPaymentLayoutVersion !== CONTRACT_PAYMENT_LAYOUT_VERSION

  const advertisers = (database.advertisers ?? []).map((advertiser) => ({
    ...advertiser,
    legalName:
      advertiser.legalName || SEED_LEGAL_NAMES.get(advertiser.id) || '',
    // Сидовые логотипы обновляем из сида (путь мог смениться вместе с
    // файлом), а загруженный в интерфейсе — оставляем как есть.
    logo:
      advertiser.logo === undefined ||
      (typeof advertiser.logo === 'string' &&
        advertiser.logo.startsWith('/logos/'))
        ? (SEED_LOGOS.get(advertiser.id) ?? advertiser.logo ?? null)
        : advertiser.logo,
    // Реквизиты, договоры и сканы появились позже — добираем их из сида.
    requisites: advertiser.requisites ?? {
      ...(REQUISITES_BY_ADVERTISER[advertiser.id] ?? {}),
    },
    contracts: advertiser.contracts?.length
      ? advertiser.contracts.map((raw) => {
          const cleaned = dropStatusesWithoutPeriod(raw)
          // Демо-договор — обновляем его статусы вместе с раскладкой сида.
          const contract = fillDemoStatuses(
            shouldUpdateContractPayments &&
              String(cleaned.id).startsWith('ctr_')
              ? {
                  ...cleaned,
                  paymentStatusByPeriod: undefined,
                  paymentLog: [],
                }
              : cleaned,
          )
          // Скан договора мог появиться в сиде позже — подтягиваем по номеру.
          const seed = (CONTRACTS_BY_ADVERTISER[advertiser.id] ?? []).find(
            (c) => c.number === contract.number,
          )
          // Суммы и история выплат появились позже — в старых записях их
          // нет. Демо-историю подставляем, только если своей не завели и
          // освоенное совпадает с сидовым: иначе цифры разъедутся.
          const own = contract.payments ?? []
          const seedMoney =
            seed && contract.budget == null && contract.spent == null
          const seedHistory =
            seed &&
            own.length === 0 &&
            (seedMoney || (contract.spent ?? 0) === seed.spent)
          const withMoney = {
            ...contract,
            budget: seedMoney ? seed.budget : contract.budget,
            spent: seedMoney ? seed.spent : contract.spent,
            payments: seedHistory
              ? (seed.payments ?? []).map((payment) => ({ ...payment }))
              : own,
          }
          if (withMoney.file) {
            // Дата загрузки скана появилась позже самого скана.
            return withMoney.file.addedAt || !seed?.file?.addedAt
              ? withMoney
              : {
                  ...withMoney,
                  file: { ...withMoney.file, addedAt: seed.file.addedAt },
                }
          }
          return seed?.file
            ? { ...withMoney, file: { ...seed.file } }
            : withMoney
        })
      : (CONTRACTS_BY_ADVERTISER[advertiser.id] ?? []).map((contract) => ({
          ...contract,
          leagues: [...contract.leagues],
        })),
  }))

  // Номера договоров по брендам — чтобы проверить ссылки кампаний.
  const contractNumbers = new Map(
    advertisers.map((a) => [
      a.id,
      new Set((a.contracts ?? []).map((c) => c.number)),
    ]),
  )

  // Демо-кампании, которых в базе ещё нет: добавились новые месяцы.
  const knownIds = new Set((database.campaigns ?? []).map((c) => c.id))
  const missingSeedCampaigns = SEED_CAMPAIGN_LIST.filter(
    (campaign) => !knownIds.has(campaign.id),
  ).map((campaign) => ({ ...campaign, payments: [] }))

  return {
    advertisers,
    channels: database.channels ?? [],
    campaigns: [...(database.campaigns ?? []), ...missingSeedCampaigns].map(
      (rawCampaign) => {
        // История поступлений появилась позже — в старых записях её нет.
        const campaign = rawCampaign.payments
          ? rawCampaign
          : { ...rawCampaign, payments: [] }
        const normalizedCampaign = normalizeCampaignStatus(campaign)
        const demoStatus = DEMO_CAMPAIGN_STATUSES[campaign.id]
        const withStatus =
          shouldUpdateDemoStatuses && demoStatus
            ? { ...normalizedCampaign, status: demoStatus }
            : normalizedCampaign

        // Дата без времени — берём полную метку из сида, если кампания демо-шная.
        const seedCreatedAt = SEED_CREATED_AT.get(campaign.id)
        const withCreatedAt =
          seedCreatedAt && !String(campaign.createdAt).includes('T')
            ? { ...withStatus, createdAt: seedCreatedAt }
            : withStatus

        // Дату загрузки ролика дописываем только там, где её нет.
        const seedCreativeAddedAt = SEED_CREATIVE_ADDED_AT.get(campaign.id)
        const withCreative =
          !withCreatedAt.creativeAddedAt &&
          withCreatedAt.creativeUrl &&
          seedCreativeAddedAt
            ? { ...withCreatedAt, creativeAddedAt: seedCreativeAddedAt }
            : withCreatedAt

        return shouldUpdateDemoStatuses
          ? fillContract(withCreative, contractNumbers)
          : withCreative
      },
    ),
    campaignStatusLayoutVersion: CAMPAIGN_STATUS_LAYOUT_VERSION,
    contractPaymentLayoutVersion: CONTRACT_PAYMENT_LAYOUT_VERSION,
  }
}

// --- Загрузка / сохранение ------------------------------------------------

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) {
      const seed = normalizeDatabase(buildSeed())
      localStorage.setItem(DB_KEY, JSON.stringify(seed))
      return seed
    }
    const parsed = normalizeDatabase(JSON.parse(raw))
    // Мягкая миграция — гарантируем наличие всех коллекций.
    localStorage.setItem(DB_KEY, JSON.stringify(parsed))
    return parsed
  } catch {
    return buildSeed()
  }
}

let state = load()
const listeners = new Set()

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state))
  } catch {
    /* переполнение квоты игнорируем — данные останутся в памяти */
  }
}

function emit() {
  persist()
  listeners.forEach((l) => l())
}

// --- Внешний API для useSyncExternalStore --------------------------------

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getState() {
  return state
}

// --- CRUD ------------------------------------------------------------------

export function create(collection, item) {
  const record = {
    id: uid(collection.slice(0, 3)),
    createdAt: new Date().toISOString(),
    ...item,
  }
  state = { ...state, [collection]: [record, ...state[collection]] }
  emit()
  return record
}

export function update(collection, id, patch) {
  state = {
    ...state,
    [collection]: state[collection].map((r) =>
      r.id === id ? { ...r, ...patch } : r,
    ),
  }
  emit()
}

export function remove(collection, id) {
  state = {
    ...state,
    [collection]: state[collection].filter((r) => r.id !== id),
  }
  emit()
}

/** Полный сброс к начальным данным (кнопка в настройках). */
export function resetDb() {
  state = normalizeDatabase(buildSeed())
  emit()
}

// Синхронизация между вкладками.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY && e.newValue) {
      try {
        state = normalizeDatabase(JSON.parse(e.newValue))
        listeners.forEach((l) => l())
      } catch {
        /* ignore */
      }
    }
  })
}
