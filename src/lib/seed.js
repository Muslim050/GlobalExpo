// Начальные мок-данные. Бренды-рекламодатели и их кампании.
// У каждого бренда по 4 кампании — по одной на каждый статус:
// полученная, рассматриваемая, активная и завершённая.
// Метрики согласованы: clicks < impressions, conversions < clicks.
// У полученных и рассматриваемых кампаний бюджет и метрики нулевые —
// они появляются после запуска.

const ADVERTISER_BASE = [
  {
    id: 'adv_artel',
    name: 'Artel',
    contact: 'Тимур Рахимов',
    email: 't.rakhimov@artelelectronics.uz',
    category: 'Электроника',
    status: 'active',
    legalName: 'ООО «Artel»',
    balance: 4820000,
    color: '#FFD106',
    createdAt: '2025-11-04',
  },
  {
    id: 'adv_click',
    name: 'Click',
    contact: 'Севара Юсупова',
    email: 's.yusupova@click.uz',
    category: 'Финтех',
    status: 'active',
    legalName: 'ООО «Click»',
    balance: 2650000,
    color: '#0EA5E9',
    createdAt: '2025-12-19',
  },
  {
    id: 'adv_korzinka',
    name: 'Korzinka',
    contact: 'Павел Ким',
    email: 'p.kim@korzinka.uz',
    category: 'Ритейл',
    status: 'active',
    legalName: 'ООО «Korzinka»',
    balance: 1290000,
    color: '#12A150',
    createdAt: '2026-01-22',
  },
  {
    id: 'adv_payme',
    name: 'Payme',
    contact: 'Азиз Каримов',
    email: 'a.karimov@payme.uz',
    category: 'Финтех',
    status: 'active',
    legalName: 'ООО «Payme»',
    balance: 1975000,
    color: '#0FB5AE',
    createdAt: '2026-02-11',
  },
  {
    id: 'adv_makro',
    name: 'Makro',
    contact: 'Дилноза Аминова',
    email: 'd.aminova@makro.uz',
    category: 'Ритейл',
    status: 'active',
    legalName: 'ООО «Makro»',
    balance: 1140000,
    color: '#F97316',
    createdAt: '2026-03-08',
  },
  {
    id: 'adv_byd',
    name: 'BYD',
    contact: 'Дмитрий Орлов',
    email: 'd.orlov@byd.uz',
    category: 'Авто',
    status: 'active',
    legalName: 'ООО «BYD»',
    balance: 3450000,
    color: '#2563EB',
    createdAt: '2026-03-25',
  },
  {
    id: 'adv_leapmotor',
    name: 'Leapmotor',
    contact: 'Алина Верес',
    email: 'a.veres@leapmotor.uz',
    category: 'Авто',
    status: 'active',
    legalName: 'ООО «Leapmotor»',
    balance: 890000,
    color: '#7C3AED',
    createdAt: '2026-04-06',
  },
  {
    id: 'adv_cherry',
    name: 'Cherry',
    contact: 'Руслан Ибрагимов',
    email: 'r.ibragimov@cherry.uz',
    category: 'Авто',
    status: 'active',
    legalName: 'ООО «Cherry»',
    balance: 2310000,
    color: '#DB2777',
    createdAt: '2026-04-18',
  },
  {
    id: 'adv_cocacola',
    name: 'Coca Cola',
    contact: 'Мария Лебедева',
    email: 'm.lebedeva@coca-cola.uz',
    category: 'Напитки',
    status: 'active',
    legalName: 'ООО «Coca Cola»',
    balance: 5240000,
    color: '#E5484D',
    createdAt: '2026-05-02',
  },
]

// Логотипы брендов — файлы лежат в /public/logos.
const BRAND_LOGOS = {
  adv_artel: '/logos/artel.png',
  adv_click: '/logos/click.png',
  adv_korzinka: '/logos/korzinka.jpeg',
  adv_payme: '/logos/payme.png',
  adv_makro: '/logos/makro.png',
  adv_byd: '/logos/byd.jpeg',
  adv_leapmotor: '/logos/leapmotor.png',
  adv_cherry: '/logos/cherry.png',
  adv_cocacola: '/logos/cocacola.jpeg',
}

export const ADVERTISERS = ADVERTISER_BASE.map((advertiser) => ({
  ...advertiser,
  logo: BRAND_LOGOS[advertiser.id] ?? null,
}))

/** Платёжные реквизиты брендов — их же подставляем в договоры. */
const REQUISITES_TEMPLATE = {
  address: 'г. Ташкент, Яшнабадский район, Choʻlpon MFY, улица Elbek, дом №8',
  bank: 'ГО АК «Алокабанк», г. Ташкент',
  mfo: '00401',
  vat: '',
  oked: '63990',
  phone: '',
}

function requisitesFor(advertiser, index) {
  return {
    ...REQUISITES_TEMPLATE,
    inn: `3119853${11 + index}`,
    account: `2020800040721497600${index + 1}`,
    email: advertiser.email,
  }
}

/**
 * Договоры брендов. Кампания ссылается на номер договора, остальные условия
 * (пакет, лиги, срок, оплата) подставляются из выбранного договора.
 */
const CONTRACT_TEMPLATES = [
  {
    suffix: '01',
    package: 'partner',
    leagues: ['epl', 'laliga', 'seriea'],
    start: '2026-01-01',
    end: '2026-12-31',
    paymentDate: '2026-08-31',
  },
  {
    suffix: '02',
    package: 'general',
    leagues: ['ufc', 'f1'],
    start: '2026-06-01',
    end: '2027-05-31',
    paymentDate: '2026-08-20',
  },
]

const pad = (n) => String(n).padStart(2, '0')

// Сканы договоров лежат в /public — в базе храним только имя и ссылку.
const CONTRACT_FILES = {
  adv_artel: {
    name: 'NDA_проект.docx',
    url: '/contracts/nda-artel.docx',
    addedAt: '2026-05-20T11:40:00',
  },
}

/**
 * Демо-статусы оплаты по месяцам 2026 года: январь–июнь закрыты
 * («Оплачено»), июль и август ждут оплату. Дальше августа не идём: будущие
 * месяцы в фильтре недоступны, статус у них выглядел бы странно.
 */
const STATUS_YEAR = 2026
const STATUS_LAST_MONTH = 7 // август
const STATUS_LAST_PAID_MONTH = 5 // июнь

export function paymentStatusesFor(contractId) {
  const byPeriod = {}
  const log = []
  for (let month = 0; month <= STATUS_LAST_MONTH; month += 1) {
    const period = `${STATUS_YEAR}-${pad(month + 1)}`
    // Январь–июнь закрыты, июль и август ещё ждут оплату.
    const closed = month <= STATUS_LAST_PAID_MONTH
    // Сначала месяц ждал оплату, потом (если закрыт) деньги пришли.
    const opened = `${period}-03T${pad(10 + (month % 5))}:${pad(
      (month * 11) % 60,
    )}:00`
    const paidAt = `${period}-${pad(18 + (month % 6))}T${pad(
      12 + (month % 5),
    )}:${pad((month * 7) % 60)}:00`

    log.push({
      id: `st_${contractId}_${period}_awaiting`,
      status: 'awaiting',
      period,
      createdAt: opened,
      by: 'admin',
    })
    if (closed) {
      log.push({
        id: `st_${contractId}_${period}_paid`,
        status: 'paid',
        period,
        createdAt: paidAt,
        by: 'admin',
      })
    }
    byPeriod[period] = closed
      ? { status: 'paid', changedAt: paidAt }
      : { status: 'awaiting', changedAt: opened }
  }
  // История — от новых к старым, как её пишет интерфейс.
  log.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  return { byPeriod, log }
}

/**
 * Демо-суммы договоров: у каждого бренда свой бюджет и своя доля прибыли,
 * чтобы в сводке по договорам цифры не были одинаковыми.
 */
const CONTRACT_BUDGETS = [
  520_000_000, 460_000_000, 380_000_000, 610_000_000, 290_000_000, 340_000_000,
  480_000_000, 250_000_000, 570_000_000,
]
const CONTRACT_SHARES = [0.82, 0.41, 0.63, 0.27, 0.55, 0.9, 0.36, 0.71, 0.18]

/**
 * Демо-история выплат: освоенную сумму разбиваем по одной из схем — где-то
 * один крупный платёж, где-то четыре мелких, с разными датами и временем.
 */
const PAYMENT_SPLITS = [
  [1],
  [0.6, 0.4],
  [0.5, 0.3, 0.2],
  [0.4, 0.25, 0.2, 0.15],
  [0.35, 0.65],
  [0.7, 0.18, 0.12],
  [0.25, 0.25, 0.5],
]

function paymentsFor(contractId, spent, seed) {
  if (spent <= 0) return []
  const shares = PAYMENT_SPLITS[seed % PAYMENT_SPLITS.length]
  // Платежи расставляем по 2026 году с разным шагом между ними.
  const firstMonth = 1 + (seed % 4)
  const step = 1 + (seed % 3)
  let left = spent
  return shares.map((share, i) => {
    const last = i === shares.length - 1
    const amount = last ? left : Math.round(spent * share)
    left -= amount
    const month = pad(Math.min(12, firstMonth + i * step))
    const day = pad(2 + ((seed * 5 + i * 9) % 26))
    const hour = pad(9 + ((seed + i * 3) % 9))
    const minute = pad((seed * 17 + i * 23) % 60)
    return {
      id: `pay_${contractId}_${i + 1}`,
      amount,
      createdAt: `2026-${month}-${day}T${hour}:${minute}:00`,
      seq: i + 1,
    }
  })
}

function contractsFor(advertiser, index) {
  return CONTRACT_TEMPLATES.map((template, order) => {
    const id = `ctr_${advertiser.id.replace('adv_', '')}_${template.suffix}`
    const statuses = paymentStatusesFor(id)
    const last = statuses.log[0]
    // Второй договор бренда — меньше первого: пакет там уже дополнительный.
    const budget = Math.round(
      CONTRACT_BUDGETS[index % CONTRACT_BUDGETS.length] * (order ? 0.55 : 1),
    )
    const spent = Math.round(
      budget * CONTRACT_SHARES[(index + order * 4) % CONTRACT_SHARES.length],
    )
    const payments = paymentsFor(id, spent, index + order)
    return {
      id,
      number: `Д-2026/${index + 1}${template.suffix}`,
      budget,
      spent,
      payments,
      legalName: advertiser.legalName,
      package: template.package,
      leagues: [...template.leagues],
      start: template.start,
      end: template.end,
      paymentDate: template.paymentDate,
      file: CONTRACT_FILES[advertiser.id] ?? null,
      paymentStatusByPeriod: statuses.byPeriod,
      paymentStatus: last.status,
      paymentStatusAt: last.createdAt,
      paymentLog: statuses.log,
    }
  })
}

export const REQUISITES_BY_ADVERTISER = Object.fromEntries(
  ADVERTISERS.map((advertiser, index) => [
    advertiser.id,
    requisitesFor(advertiser, index),
  ]),
)

export const CONTRACTS_BY_ADVERTISER = Object.fromEntries(
  ADVERTISERS.map((advertiser, index) => [
    advertiser.id,
    contractsFor(advertiser, index),
  ]),
)

export const CHANNELS = [
  {
    id: 'ch_prime',
    name: 'CTV Prime',
    type: 'CTV',
    format: 'Pre-roll',
    reach: 8200000,
    cpm: 420,
    fillRate: 92,
    status: 'active',
    color: '#FFD106',
  },
  {
    id: 'ch_potok',
    name: 'Первый Поток',
    type: 'TV',
    format: 'Mid-roll',
    reach: 15400000,
    cpm: 610,
    fillRate: 88,
    status: 'active',
    color: '#0EA5E9',
  },
  {
    id: 'ch_webvision',
    name: 'WebVision',
    type: 'Web',
    format: 'Native',
    reach: 5300000,
    cpm: 240,
    fillRate: 95,
    status: 'active',
    color: '#12A150',
  },
  {
    id: 'ch_mobile',
    name: 'MobileReach',
    type: 'Mobile',
    format: 'Rewarded',
    reach: 9700000,
    cpm: 180,
    fillRate: 97,
    status: 'active',
    color: '#F7C900',
  },
  {
    id: 'ch_social',
    name: 'SocialWave',
    type: 'Social',
    format: 'In-feed',
    reach: 12100000,
    cpm: 310,
    fillRate: 90,
    status: 'active',
    color: '#E5484D',
  },
  {
    id: 'ch_audio',
    name: 'AudioStream',
    type: 'Audio',
    format: 'Audio-ad',
    reach: 3400000,
    cpm: 150,
    fillRate: 84,
    status: 'inactive',
    color: '#8B5CF6',
  },
]

const CAMPAIGN_BASE = [
  {
    id: 'cmp_1001',
    name: 'Кондиционеры — летний сезон',
    advertiserId: 'adv_artel',
    status: 'active',
    objective: 'conversions',
    budget: 500000000,
    spent: 300000000,
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    channelIds: ['ch_prime', 'ch_webvision', 'ch_social'],
    impressions: 9840000,
    clicks: 214000,
    conversions: 18600,
    creativeUrl: null,
    createdAt: '2026-05-24T09:00:00',
  },
  {
    id: 'cmp_1002',
    name: 'Переводы без комиссии',
    advertiserId: 'adv_click',
    status: 'active',
    objective: 'traffic',
    budget: 450000000,
    spent: 250000000,
    startDate: '2026-06-15',
    endDate: '2026-09-15',
    channelIds: ['ch_potok', 'ch_prime'],
    impressions: 6120000,
    clicks: 132000,
    conversions: 7400,
    creativeUrl: null,
    createdAt: '2026-06-05T12:17:00',
  },
  {
    id: 'cmp_1003',
    name: 'Korzinka Go — запуск доставки',
    advertiserId: 'adv_korzinka',
    status: 'active',
    objective: 'awareness',
    budget: 350000000,
    spent: 150000000,
    startDate: '2026-05-20',
    endDate: '2026-09-30',
    channelIds: ['ch_potok', 'ch_social', 'ch_mobile'],
    impressions: 12400000,
    clicks: 178000,
    conversions: 5200,
    creativeUrl: null,
    createdAt: '2026-05-12T15:34:00',
  },
  {
    id: 'cmp_1004',
    name: 'Оплата по QR — охват',
    advertiserId: 'adv_payme',
    status: 'sent',
    objective: 'reach',
    budget: 0,
    spent: 0,
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    channelIds: ['ch_webvision', 'ch_mobile'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-03-28T09:51:00',
  },
  {
    id: 'cmp_1005',
    name: 'Доставка за 15 минут',
    advertiserId: 'adv_makro',
    status: 'sent',
    objective: 'conversions',
    budget: 0,
    spent: 0,
    startDate: '2026-09-15',
    endDate: '2026-11-15',
    channelIds: ['ch_mobile', 'ch_social'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-06-01T12:08:00',
  },
  {
    id: 'cmp_1006',
    name: 'BYD Song Plus — тест-драйв',
    advertiserId: 'adv_byd',
    status: 'reviewing',
    objective: 'traffic',
    budget: 0,
    spent: 0,
    startDate: '2026-07-25',
    endDate: '2026-09-01',
    channelIds: ['ch_social'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-07-14T15:25:00',
  },
  {
    id: 'cmp_1007',
    name: 'Leapmotor C10 — премьера',
    advertiserId: 'adv_leapmotor',
    status: 'completed',
    objective: 'awareness',
    budget: 250000000,
    spent: 50000000,
    startDate: '2026-05-05',
    endDate: '2026-07-20',
    channelIds: ['ch_prime', 'ch_potok'],
    impressions: 7900000,
    clicks: 88000,
    conversions: 3100,
    creativeUrl: null,
    createdAt: '2026-04-29T09:42:00',
  },
  {
    id: 'cmp_1008',
    name: 'Cherry Tiggo 8 Pro — спецпредложение',
    advertiserId: 'adv_cherry',
    status: 'active',
    objective: 'conversions',
    budget: 400000000,
    spent: 200000000,
    startDate: '2026-06-20',
    endDate: '2026-08-20',
    channelIds: ['ch_social', 'ch_webvision', 'ch_mobile'],
    impressions: 6700000,
    clicks: 203000,
    conversions: 15400,
    creativeUrl: null,
    createdAt: '2026-06-12T12:59:00',
  },
  {
    id: 'cmp_1009',
    name: 'Освежись летом',
    advertiserId: 'adv_cocacola',
    status: 'reviewing',
    objective: 'reach',
    budget: 0,
    spent: 0,
    startDate: '2026-08-15',
    endDate: '2026-10-01',
    channelIds: ['ch_prime'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-07-10T15:16:00',
  },
  {
    id: 'cmp_1011',
    name: 'Стиральные машины — старт продаж',
    advertiserId: 'adv_artel',
    status: 'reviewing',
    objective: 'traffic',
    budget: 0,
    spent: 0,
    startDate: '2026-08-20',
    endDate: '2026-08-31',
    channelIds: ['ch_mobile'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-01T12:50:00',
  },
  {
    id: 'cmp_1012',
    name: 'Телевизоры Artel — большой экран',
    advertiserId: 'adv_artel',
    status: 'completed',
    objective: 'awareness',
    budget: 300000000,
    spent: 100000000,
    startDate: '2026-08-01',
    endDate: '2026-08-07',
    channelIds: ['ch_potok', 'ch_prime'],
    impressions: 8600000,
    clicks: 121000,
    conversions: 4300,
    creativeUrl: null,
    createdAt: '2025-12-28T15:07:00',
  },

  // --- Click ---------------------------------------------------------------
  {
    id: 'cmp_1013',
    name: 'Click Pass — подписка',
    advertiserId: 'adv_click',
    status: 'sent',
    objective: 'reach',
    budget: 0,
    spent: 0,
    startDate: '2026-09-05',
    endDate: '2026-11-05',
    channelIds: ['ch_mobile', 'ch_social'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-02T09:24:00',
  },
  {
    id: 'cmp_1014',
    name: 'Оплата ЖКХ в один клик',
    advertiserId: 'adv_click',
    status: 'reviewing',
    objective: 'traffic',
    budget: 0,
    spent: 0,
    startDate: '2026-09-20',
    endDate: '2026-11-20',
    channelIds: ['ch_webvision'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-06T12:41:00',
  },
  {
    id: 'cmp_1015',
    name: 'Кешбэк на всё — весенний старт',
    advertiserId: 'adv_click',
    status: 'completed',
    objective: 'conversions',
    budget: 280000000,
    spent: 260000000,
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    channelIds: ['ch_potok', 'ch_mobile'],
    impressions: 7200000,
    clicks: 158000,
    conversions: 9600,
    creativeUrl: null,
    createdAt: '2026-02-18T15:58:00',
  },

  // --- Korzinka ------------------------------------------------------------
  {
    id: 'cmp_1016',
    name: 'Korzinka Club — карта лояльности',
    advertiserId: 'adv_korzinka',
    status: 'sent',
    objective: 'conversions',
    budget: 0,
    spent: 0,
    startDate: '2026-09-10',
    endDate: '2026-11-10',
    channelIds: ['ch_social', 'ch_mobile'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-04T09:15:00',
  },
  {
    id: 'cmp_1017',
    name: 'Свежие овощи каждый день',
    advertiserId: 'adv_korzinka',
    status: 'reviewing',
    objective: 'awareness',
    budget: 0,
    spent: 0,
    startDate: '2026-10-01',
    endDate: '2026-12-01',
    channelIds: ['ch_prime'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-07T12:32:00',
  },
  {
    id: 'cmp_1018',
    name: 'Новогодняя корзина',
    advertiserId: 'adv_korzinka',
    status: 'completed',
    objective: 'awareness',
    budget: 320000000,
    spent: 300000000,
    startDate: '2025-12-15',
    endDate: '2026-01-15',
    channelIds: ['ch_potok', 'ch_prime', 'ch_social'],
    impressions: 9100000,
    clicks: 134000,
    conversions: 6800,
    creativeUrl: null,
    createdAt: '2025-12-01T15:49:00',
  },

  // --- Payme ---------------------------------------------------------------
  {
    id: 'cmp_1019',
    name: 'Payme Wallet — переводы за секунду',
    advertiserId: 'adv_payme',
    status: 'reviewing',
    objective: 'traffic',
    budget: 0,
    spent: 0,
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    channelIds: ['ch_webvision', 'ch_mobile'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-03T09:06:00',
  },
  {
    id: 'cmp_1020',
    name: 'Рассрочка Payme — летний старт',
    advertiserId: 'adv_payme',
    status: 'active',
    objective: 'conversions',
    budget: 380000000,
    spent: 210000000,
    startDate: '2026-06-25',
    endDate: '2026-09-25',
    channelIds: ['ch_prime', 'ch_social'],
    impressions: 5400000,
    clicks: 148000,
    conversions: 11200,
    creativeUrl: null,
    createdAt: '2026-06-14T12:23:00',
  },
  {
    id: 'cmp_1021',
    name: 'Оплата счетов без комиссии',
    advertiserId: 'adv_payme',
    status: 'completed',
    objective: 'reach',
    budget: 210000000,
    spent: 195000000,
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    channelIds: ['ch_potok'],
    impressions: 6300000,
    clicks: 74000,
    conversions: 2900,
    creativeUrl: null,
    createdAt: '2026-01-20T15:40:00',
  },

  // --- Makro ---------------------------------------------------------------
  {
    id: 'cmp_1022',
    name: 'Makro Market — открытие в Ташкенте',
    advertiserId: 'adv_makro',
    status: 'reviewing',
    objective: 'awareness',
    budget: 0,
    spent: 0,
    startDate: '2026-09-12',
    endDate: '2026-11-12',
    channelIds: ['ch_prime', 'ch_potok'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-05T09:57:00',
  },
  {
    id: 'cmp_1023',
    name: 'Скидки недели — продукты',
    advertiserId: 'adv_makro',
    status: 'active',
    objective: 'conversions',
    budget: 260000000,
    spent: 140000000,
    startDate: '2026-07-01',
    endDate: '2026-09-30',
    channelIds: ['ch_social', 'ch_mobile'],
    impressions: 4900000,
    clicks: 121000,
    conversions: 9400,
    creativeUrl: null,
    createdAt: '2026-06-22T12:14:00',
  },
  {
    id: 'cmp_1024',
    name: 'Зимний марафон скидок',
    advertiserId: 'adv_makro',
    status: 'completed',
    objective: 'traffic',
    budget: 240000000,
    spent: 230000000,
    startDate: '2026-01-05',
    endDate: '2026-02-28',
    channelIds: ['ch_webvision', 'ch_social'],
    impressions: 5800000,
    clicks: 96000,
    conversions: 4100,
    creativeUrl: null,
    createdAt: '2025-12-20T15:31:00',
  },

  // --- BYD -----------------------------------------------------------------
  {
    id: 'cmp_1025',
    name: 'BYD Seal — предзаказ',
    advertiserId: 'adv_byd',
    status: 'sent',
    objective: 'reach',
    budget: 0,
    spent: 0,
    startDate: '2026-09-08',
    endDate: '2026-11-08',
    channelIds: ['ch_prime', 'ch_webvision'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-06T09:48:00',
  },
  {
    id: 'cmp_1026',
    name: 'BYD Dolphin — городской электрокар',
    advertiserId: 'adv_byd',
    status: 'active',
    objective: 'traffic',
    budget: 420000000,
    spent: 260000000,
    startDate: '2026-06-05',
    endDate: '2026-09-05',
    channelIds: ['ch_potok', 'ch_social'],
    impressions: 7400000,
    clicks: 165000,
    conversions: 6200,
    creativeUrl: null,
    createdAt: '2026-05-26T12:05:00',
  },
  {
    id: 'cmp_1027',
    name: 'BYD Han — премьера седана',
    advertiserId: 'adv_byd',
    status: 'completed',
    objective: 'awareness',
    budget: 360000000,
    spent: 340000000,
    startDate: '2026-03-10',
    endDate: '2026-06-10',
    channelIds: ['ch_prime', 'ch_potok', 'ch_webvision'],
    impressions: 8800000,
    clicks: 112000,
    conversions: 3600,
    creativeUrl: null,
    createdAt: '2026-02-25T15:22:00',
  },

  // --- Leapmotor -----------------------------------------------------------
  {
    id: 'cmp_1028',
    name: 'Leapmotor T03 — компактный электрокар',
    advertiserId: 'adv_leapmotor',
    status: 'sent',
    objective: 'awareness',
    budget: 0,
    spent: 0,
    startDate: '2026-09-18',
    endDate: '2026-11-18',
    channelIds: ['ch_mobile'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-07T09:39:00',
  },
  {
    id: 'cmp_1029',
    name: 'Leapmotor — сервис и гарантия',
    advertiserId: 'adv_leapmotor',
    status: 'reviewing',
    objective: 'traffic',
    budget: 0,
    spent: 0,
    startDate: '2026-10-05',
    endDate: '2026-12-05',
    channelIds: ['ch_webvision', 'ch_social'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-08T12:56:00',
  },
  {
    id: 'cmp_1030',
    name: 'Leapmotor C16 — семейный кроссовер',
    advertiserId: 'adv_leapmotor',
    status: 'active',
    objective: 'conversions',
    budget: 310000000,
    spent: 170000000,
    startDate: '2026-07-10',
    endDate: '2026-10-10',
    channelIds: ['ch_prime', 'ch_social'],
    impressions: 5100000,
    clicks: 97000,
    conversions: 4400,
    creativeUrl: null,
    createdAt: '2026-06-30T15:13:00',
  },

  // --- Cherry --------------------------------------------------------------
  {
    id: 'cmp_1031',
    name: 'Cherry Tiggo 4 — старт продаж',
    advertiserId: 'adv_cherry',
    status: 'sent',
    objective: 'conversions',
    budget: 0,
    spent: 0,
    startDate: '2026-09-25',
    endDate: '2026-11-25',
    channelIds: ['ch_social', 'ch_webvision'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-07T09:30:00',
  },
  {
    id: 'cmp_1032',
    name: 'Cherry Arrizo 8 — бизнес-седан',
    advertiserId: 'adv_cherry',
    status: 'reviewing',
    objective: 'reach',
    budget: 0,
    spent: 0,
    startDate: '2026-10-10',
    endDate: '2026-12-10',
    channelIds: ['ch_prime'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-06T12:47:00',
  },
  {
    id: 'cmp_1033',
    name: 'Cherry — весенний тест-драйв',
    advertiserId: 'adv_cherry',
    status: 'completed',
    objective: 'traffic',
    budget: 270000000,
    spent: 250000000,
    startDate: '2026-03-20',
    endDate: '2026-05-20',
    channelIds: ['ch_potok', 'ch_mobile'],
    impressions: 6900000,
    clicks: 143000,
    conversions: 5700,
    creativeUrl: null,
    createdAt: '2026-03-05T15:04:00',
  },

  // --- Coca Cola -----------------------------------------------------------
  {
    id: 'cmp_1034',
    name: 'Coca Cola Zero — новый вкус',
    advertiserId: 'adv_cocacola',
    status: 'sent',
    objective: 'awareness',
    budget: 0,
    spent: 0,
    startDate: '2026-09-02',
    endDate: '2026-11-02',
    channelIds: ['ch_prime', 'ch_social'],
    impressions: 0,
    clicks: 0,
    conversions: 0,
    creativeUrl: null,
    createdAt: '2026-08-01T09:21:00',
  },
  {
    id: 'cmp_1035',
    name: 'Футбол и Coca Cola',
    advertiserId: 'adv_cocacola',
    status: 'active',
    objective: 'reach',
    budget: 540000000,
    spent: 320000000,
    startDate: '2026-06-10',
    endDate: '2026-09-10',
    channelIds: ['ch_prime', 'ch_potok', 'ch_social'],
    impressions: 13600000,
    clicks: 231000,
    conversions: 8900,
    creativeUrl: null,
    createdAt: '2026-05-30T12:38:00',
  },
  {
    id: 'cmp_1036',
    name: 'Новый год с Coca Cola',
    advertiserId: 'adv_cocacola',
    status: 'completed',
    objective: 'awareness',
    budget: 480000000,
    spent: 460000000,
    startDate: '2025-12-01',
    endDate: '2026-01-10',
    channelIds: ['ch_potok', 'ch_prime', 'ch_webvision'],
    impressions: 15200000,
    clicks: 198000,
    conversions: 7300,
    creativeUrl: null,
    createdAt: '2025-11-18T15:55:00',
  },
]

/**
 * Заказы Artel: все кампании бренда идут в текущем месяце (август 2026) —
 * по нему в списке открывается наполненная таблица заказов. Вместе с
 * четырьмя кампаниями из CAMPAIGN_BASE их получается 30.
 */
const ARTEL_ORDERS = 26
const ARTEL_MONTH = '2026-08'

const ARTEL_PRODUCTS = [
  'Холодильники',
  'Стиральные машины',
  'Телевизоры',
  'Кондиционеры',
  'Пылесосы',
  'Микроволновки',
  'Ноутбуки',
  'Смартфоны',
]

const ARTEL_OFFERS = [
  'летняя акция',
  'августовский завоз',
  'трейд-ин',
  'скидка недели',
]

const MONTHLY_OBJECTIVES = ['awareness', 'traffic', 'conversions', 'reach']
const MONTHLY_CHANNELS = [
  ['ch_prime', 'ch_potok'],
  ['ch_webvision', 'ch_social'],
  ['ch_mobile'],
  ['ch_potok', 'ch_social', 'ch_mobile'],
]

/**
 * Заказ внутри месяца. Статус согласован с датами: что закрылось в начале
 * месяца — завершено, что идёт сейчас — активно, поздний старт — ещё на
 * рассмотрении. У закрытых месяцев все заказы завершены.
 */
function artelOrder(index, monthKey = ARTEL_MONTH, prefix = '2') {
  const closedMonth = monthKey < ARTEL_MONTH
  const status = closedMonth
    ? 'completed'
    : ['completed', 'active', 'reviewing'][index % 3]
  const [startDay, endDay] =
    status === 'completed'
      ? [1 + (index % 4), 5 + (index % 4)]
      : status === 'active'
        ? [1 + (index % 6), 24 + (index % 8)]
        : [12 + (index % 8), 31]
  const planned = status === 'reviewing'
  const budget = planned ? 0 : (120 + ((index * 7) % 9) * 30) * 1e6
  const ratio = status === 'completed' ? 0.7 + (index % 4) * 0.07 : 0.4
  const spent = Math.round((budget * ratio) / 1e6) * 1e6
  const impressions = Math.round(spent / 12)
  const clicks = Math.round(impressions / 70)

  const lastDay = new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)),
    0,
  ).getDate()

  return {
    id: `cmp_${prefix}${pad(index + 1).padStart(3, '0')}`,
    name: `${ARTEL_PRODUCTS[index % ARTEL_PRODUCTS.length]} Artel — ${
      ARTEL_OFFERS[
        Math.floor(index / ARTEL_PRODUCTS.length) % ARTEL_OFFERS.length
      ]
    }`,
    advertiserId: 'adv_artel',
    status,
    objective: MONTHLY_OBJECTIVES[index % MONTHLY_OBJECTIVES.length],
    budget,
    spent,
    startDate: `${monthKey}-${pad(Math.min(startDay, lastDay))}`,
    endDate: `${monthKey}-${pad(Math.min(endDay, lastDay))}`,
    channelIds: [...MONTHLY_CHANNELS[index % MONTHLY_CHANNELS.length]],
    impressions,
    clicks,
    conversions: Math.round(clicks / 28),
    creativeUrl: null,
    // Заявку заводят в месяце перед стартом.
    createdAt: `${previousMonth(monthKey)}-${pad(5 + (index % 20))}T${pad(
      9 + (index % 8),
    )}:15:00`,
  }
}

/** Предыдущий месяц в формате гггг-мм. */
function previousMonth(monthKey) {
  const year = Number(monthKey.slice(0, 4))
  const month = Number(monthKey.slice(5, 7))
  return month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`
}

// Закрытые месяцы 2026 года тоже с заказами: по ним смотрят отчёт и список.
const ARTEL_CLOSED_MONTHS = [
  { month: '2026-01', orders: 8, prefix: '3' },
  { month: '2026-02', orders: 6, prefix: '4' },
  { month: '2026-03', orders: 7, prefix: '5' },
  { month: '2026-04', orders: 5, prefix: '6' },
  { month: '2026-05', orders: 9, prefix: '7' },
  { month: '2026-06', orders: 6, prefix: '8' },
  { month: '2026-07', orders: 7, prefix: '9' },
]

const ARTEL_MONTHLY = [
  ...Array.from({ length: ARTEL_ORDERS }, (_, index) => artelOrder(index)),
  ...ARTEL_CLOSED_MONTHS.flatMap(({ month, orders, prefix }) =>
    Array.from({ length: orders }, (_, index) =>
      artelOrder(index, month, prefix),
    ),
  ),
]

// Заказы остальных брендов в закрытых месяцах: без них старые месяцы у всех,
// кроме Artel, оставались пустыми.
const BRAND_OFFERS = {
  adv_click: [
    'Переводы без комиссии',
    'Оплата по QR',
    'Кэшбэк недели',
    'Click Pass',
  ],
  adv_korzinka: [
    'Korzinka Go',
    'Скидки выходного дня',
    'Клубная карта',
    'Доставка за час',
  ],
  adv_payme: [
    'Payme Gold',
    'Оплата коммуналки',
    'Бонусы за перевод',
    'Рассрочка',
  ],
  adv_makro: ['Makro Fresh', 'Цены недели', 'Собственная марка', 'Доставка'],
  adv_byd: ['BYD Song Plus', 'BYD Seal', 'Тест-драйв', 'Сервисная кампания'],
  adv_leapmotor: [
    'Leapmotor T03',
    'Leapmotor C11',
    'Тест-драйв',
    'Городская серия',
  ],
  adv_cherry: ['Cherry Tiggo 4', 'Cherry Tiggo 7', 'Старт продаж', 'Трейд-ин'],
  adv_cocacola: [
    'Coca Cola Zero',
    'Летняя серия',
    'Промо в кино',
    'Новый вкус',
  ],
}

const BRAND_MONTHS = [
  '2026-01',
  '2026-02',
  '2026-03',
  '2026-04',
  '2026-05',
  '2026-06',
  '2026-07',
]

/** Заказ бренда в закрытом месяце: завершён, с фактом и бюджетом. */
function brandOrder(advertiserId, monthKey, index, seq) {
  const offers = BRAND_OFFERS[advertiserId] ?? ['Кампания']
  const budget = (60 + ((seq * 5) % 8) * 25) * 1e6
  const spent = Math.round((budget * (0.72 + (seq % 4) * 0.06)) / 1e6) * 1e6
  const impressions = Math.round(spent / 11)
  const clicks = Math.round(impressions / 65)
  const lastDay = new Date(
    Number(monthKey.slice(0, 4)),
    Number(monthKey.slice(5, 7)),
    0,
  ).getDate()
  const startDay = 1 + ((seq * 3) % 12)
  const endDay = Math.min(lastDay, startDay + 9 + (seq % 8))

  return {
    id: `cmp_b${advertiserId.replace('adv_', '')}_${monthKey.replace('-', '')}_${index + 1}`,
    name: `${offers[seq % offers.length]} — ${MONTHS_FULL_RU[Number(monthKey.slice(5, 7)) - 1]}`,
    advertiserId,
    status: 'completed',
    objective: MONTHLY_OBJECTIVES[seq % MONTHLY_OBJECTIVES.length],
    budget,
    spent,
    startDate: `${monthKey}-${pad(startDay)}`,
    endDate: `${monthKey}-${pad(endDay)}`,
    channelIds: [...MONTHLY_CHANNELS[seq % MONTHLY_CHANNELS.length]],
    impressions,
    clicks,
    conversions: Math.round(clicks / 30),
    creativeUrl: null,
    createdAt: `${previousMonth(monthKey)}-${pad(6 + (seq % 18))}T${pad(
      10 + (seq % 7),
    )}:20:00`,
  }
}

const MONTHS_FULL_RU = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
]

const BRAND_MONTHLY = Object.keys(BRAND_OFFERS).flatMap(
  (advertiserId, brandIndex) =>
    BRAND_MONTHS.flatMap((monthKey, monthIndex) => {
      // 2–4 заказа на месяц — у каждого бренда свой ритм.
      const orders = 2 + ((brandIndex + monthIndex) % 3)
      return Array.from({ length: orders }, (_, index) =>
        brandOrder(
          advertiserId,
          monthKey,
          index,
          brandIndex * 7 + monthIndex * 3 + index,
        ),
      )
    }),
)

// Каждая кампания привязана к одному из договоров своего бренда — условия
// (пакет, лиги, юр. лицо, срок, оплата) берём прямо из него.
const seenByAdvertiser = new Map()

/**
 * Демо-дата загрузки ролика: за 3–7 дней до старта кампании, в рабочее время.
 * Считается от полей самой кампании, поэтому одинакова при каждом запуске.
 */
export function creativeAddedAtFor(campaign, index = 0) {
  if (!campaign.creativeUrl || !campaign.startDate) return null
  // Разброс считаем от id кампании — время выходит разным, но стабильным.
  const salt =
    index +
    [...String(campaign.id)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const date = new Date(`${campaign.startDate}T00:00:00`)
  date.setDate(date.getDate() - (2 + (salt % 6)))
  const hours = 9 + (salt % 9)
  const minutes = (salt * 7) % 60
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(hours)}:${pad(minutes)}:00`
  )
}

export const CAMPAIGNS = [
  ...CAMPAIGN_BASE,
  ...ARTEL_MONTHLY,
  ...BRAND_MONTHLY,
].map((campaign) => {
  const contracts = CONTRACTS_BY_ADVERTISER[campaign.advertiserId] ?? []
  const seen = seenByAdvertiser.get(campaign.advertiserId) ?? 0
  seenByAdvertiser.set(campaign.advertiserId, seen + 1)
  // Берём договор, чей срок покрывает старт кампании; если такого нет —
  // раскладываем по кругу, как раньше.
  const fitting = contracts.filter(
    (c) => c.start <= campaign.startDate && campaign.startDate <= c.end,
  )
  const pool = fitting.length ? fitting : contracts
  const contract = pool[seen % (pool.length || 1)]
  const creativeAddedAt = creativeAddedAtFor(campaign, seen)
  if (!contract) {
    return creativeAddedAt ? { ...campaign, creativeAddedAt } : campaign
  }

  return {
    ...campaign,
    ...(creativeAddedAt ? { creativeAddedAt } : null),
    contractNumber: contract.number,
    legalName: contract.legalName,
    package: contract.package,
    leagues: [...contract.leagues],
    contractStart: contract.start,
    contractEnd: contract.end,
    paymentDate: contract.paymentDate,
  }
})

export function buildSeed() {
  return {
    advertisers: ADVERTISERS.map((a) => ({
      ...a,
      requisites: { ...REQUISITES_BY_ADVERTISER[a.id] },
      contracts: CONTRACTS_BY_ADVERTISER[a.id].map((c) => ({
        ...c,
        leagues: [...c.leagues],
      })),
    })),
    channels: CHANNELS.map((c) => ({ ...c })),
    campaigns: CAMPAIGNS.map((c) => ({
      ...c,
      channelIds: [...c.channelIds],
      leagues: [...c.leagues],
    })),
  }
}
