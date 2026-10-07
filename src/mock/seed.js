/**
 * Демо-данные платформы: немного записей, чтобы каждый экран был заполнен,
 * но легко читался. Формы — один в один как у API (src/api/types.ts).
 * Данные собираются на «сегодня» TODAY: от него считаются оплаченные месяцы.
 */

export const TODAY = '2026-09-30'

const ADMIN = 'Меликулов А.А.'
const MANAGER = 'Ольга Ким'
const DEMO_SPOT = '/creatives/global-expo-demo.mp4'
const CONTRACT_SCAN = '/contracts/nda-artel.docx'

// Каталог стендов: что получает экспонент в каждом пакете. Фото — снимки
// с выставок Global Expo; правит каталог площадка в разделе «Стенды».
const PACKAGE_CATALOG = [
  {
    key: 'standard-1',
    category: 'standard',
    name: 'Стандарт',
    area: 26,
    price: 180_000_000,
    description:
      'Компактный стенд в общем ряду павильона — чтобы заявить о бренде и встретить посетителей.',
    features: [
      'Площадь 26 м², застройка «под ключ»',
      'Стойка ресепшн и два стула',
      'Фриз с названием компании',
      'Освещение и розетка 220 В',
      'Упоминание в каталоге выставки',
    ],
    photos: ['stand-5.webp'],
  },
  {
    key: 'vip-1',
    category: 'vip',
    name: 'VIP',
    area: 32,
    price: 240_000_000,
    description:
      'Стенд на пересечении проходов с открытыми сторонами, переговорной зоной и экраном для презентаций.',
    features: [
      'Площадь 32 м², угловое место',
      'Индивидуальный дизайн по 3D проекту',
      'Переговорная зона и подсобка',
      'LED-экран 2×1 м',
      'Логотип на навигации павильона',
      'Два бейджа участника',
    ],
    photos: ['stand-2.webp', 'stand-1.webp'],
  },
  {
    key: 'platinum-1',
    category: 'platinum',
    name: 'Platinum',
    area: 55,
    price: 460_000_000,
    description:
      'Островной стенд в центре павильона: полная застройка по 3D проекту, медиастены и сопровождение команды Global Expo.',
    features: [
      'Площадь 55 м², остров в центре зала',
      'Застройка по 3D проекту с медиастенами',
      'Лаунж-зона, переговорная и склад',
      'Персональный менеджер на всю выставку',
      'Фото и видео отчёт после выставки',
      'Анонс в рассылке и соцсетях Global Expo',
    ],
    photos: ['stand-3.webp', 'stand-4.webp', 'stand-1.webp'],
  },
]

// Фото и видео отчёт завершённых стендов: снимки с выставок Global Expo,
// у Korzinka вдобавок ролик. Ключ — договор стенда.
const STAND_REPORTS = {
  'korzinka-1': [
    'stand-1.webp',
    'stand-2.webp',
    'stand-3.webp',
    'stand-4.webp',
    'video',
  ],
  'payme-1': ['stand-5.webp', 'stand-3.webp', 'stand-1.webp'],
}

const pad = (n) => String(n).padStart(2, '0')
const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2)

const ADVERTISERS = [
  {
    name: 'Artel',
    contact: 'Тимур Рахимов',
    email: 't.rakhimov@artel.uz',
    category: 'Электроника',
    legalName: 'ООО «Artel Electronics»',
    color: '#3AAA35',
    logo: '/logos/artel.png',
    createdAt: '2025-11-04T10:15:00+05:00',
  },
  {
    name: 'Click',
    contact: 'Севара Юсупова',
    email: 's.yusupova@click.uz',
    category: 'Финтех',
    legalName: 'ООО «Click»',
    color: '#0EA5E9',
    logo: '/logos/click.png',
    createdAt: '2025-12-19T11:40:00+05:00',
  },
  {
    name: 'Payme',
    contact: 'Азиз Турсунов',
    email: 'a.tursunov@payme.uz',
    category: 'Финтех',
    legalName: 'ООО «Payme»',
    color: '#0FB5AE',
    logo: '/logos/payme.png',
    createdAt: '2026-01-12T09:25:00+05:00',
  },
  {
    name: 'Korzinka',
    contact: 'Павел Ким',
    email: 'p.kim@korzinka.uz',
    category: 'Ритейл',
    legalName: 'ООО «Korzinka»',
    color: '#D92D20',
    logo: '/logos/korzinka.jpeg',
    createdAt: '2026-01-22T15:02:00+05:00',
  },
  {
    name: 'Coca-Cola Uzbekistan',
    contact: 'Мария Лебедева',
    email: 'm.lebedeva@coca-cola.uz',
    category: 'Напитки',
    legalName: 'ИП ООО «Coca-Cola Ichimligi Uzbekiston»',
    color: '#E5484D',
    logo: '/logos/cocacola.jpeg',
    createdAt: '2026-03-02T09:05:00+05:00',
  },
]

// Договоры брендов. `key` — внутренний ключ: по нему кампании и отчёты
// привязаны к договору, в интерфейсе его нет. `since` — месяц, с которого
// по договору ведётся помесячная отметка об оплате.
const CONTRACTS = [
  {
    brand: 'Artel',
    key: 'artel-1',
    exhibition: 'uzcharmexpo',
    package: 'platinum',
    name: 'Artel — сезон выставок',
    since: '2026-01',
    paymentDate: '2026-10-15',
    budget: 520_000_000,
    spent: 426_400_000,
    scan: true,
    spot: true,
  },
  {
    brand: 'Artel',
    key: 'artel-2',
    exhibition: 'eurasia',
    package: 'standard',
    name: 'Artel Smart Home',
    since: '2026-06',
    paymentDate: '2026-10-20',
    budget: 286_000_000,
    spent: 117_300_000,
    scan: false,
    spot: false,
  },
  {
    brand: 'Click',
    key: 'click-1',
    exhibition: 'banks-business',
    package: 'vip',
    name: 'Click — переводы без комиссии',
    since: '2026-03',
    paymentDate: '2026-09-30',
    budget: 460_000_000,
    spent: 290_000_000,
    scan: true,
    spot: true,
  },
  {
    brand: 'Payme',
    key: 'payme-1',
    exhibition: 'banks-business',
    package: 'vip',
    name: 'Рассрочка Payme',
    since: '2026-04',
    paymentDate: '2026-10-15',
    budget: 610_000_000,
    spent: 165_000_000,
    scan: false,
    spot: true,
  },
  {
    brand: 'Korzinka',
    key: 'korzinka-1',
    exhibition: 'nextstep',
    package: 'standard',
    name: 'Korzinka Go — доставка',
    since: '2026-02',
    paymentDate: '2026-08-31',
    budget: 380_000_000,
    spent: 209_000_000,
    scan: true,
    spot: false,
  },
  {
    brand: 'Coca-Cola Uzbekistan',
    key: 'cola-1',
    exhibition: 'uzcharmexpo',
    package: 'platinum',
    name: 'Освежись летом',
    since: '2026-04',
    paymentDate: '2026-08-31',
    budget: 570_000_000,
    spent: 285_000_000,
    scan: true,
    spot: true,
  },
]

// [ключ договора, название, статус, цель, начало, конец, показы, создана]
const CAMPAIGNS = [
  [
    'artel-1',
    'Кондиционеры Artel — летний сезон',
    'active',
    'conversions',
    '2026-06-01',
    '2026-10-15',
    9_840_000,
    '2026-05-24T09:12:00+05:00',
  ],
  [
    'artel-2',
    'Artel Smart Home — старт продаж',
    'reviewing',
    'traffic',
    '2026-10-01',
    '2026-11-30',
    0,
    '2026-09-22T11:47:00+05:00',
  ],
  [
    'click-1',
    'Click — переводы без комиссии',
    'sent',
    'reach',
    '2026-10-05',
    '2026-11-15',
    0,
    '2026-09-28T16:42:00+05:00',
  ],
  [
    'payme-1',
    'Рассрочка Payme — осенний старт',
    'awaiting_payment',
    'awareness',
    '2026-08-01',
    '2026-09-15',
    3_900_000,
    '2026-07-21T16:05:00+05:00',
  ],
  [
    'korzinka-1',
    'Korzinka Go — запуск доставки',
    'completed',
    'traffic',
    '2026-05-20',
    '2026-08-31',
    10_200_000,
    '2026-05-06T17:14:00+05:00',
  ],
  [
    'cola-1',
    'Coca-Cola — выставочный сезон',
    'received',
    'awareness',
    '2026-10-01',
    '2026-10-31',
    0,
    '2026-09-27T18:03:00+05:00',
  ],
]

// Отчёты по месяцам: [ключ договора, месяц, когда загрузили, кто].
const REPORTS = [
  ['artel-1', '2026-07', '2026-08-04T10:05:00+05:00', ADMIN],
  ['artel-1', '2026-08', '2026-09-04T15:12:00+05:00', ADMIN],
  ['korzinka-1', '2026-08', '2026-09-03T14:50:00+05:00', MANAGER],
]

const USERS = [
  [
    'admin',
    // Имя показывается как «Имя Фамилия» — так в шапке выходит «Меликулов А.А.».
    'Меликулов',
    'А.А.',
    'd.karimov@globalexpo.uz',
    '+998 90 123-45-67',
    'admin',
    null,
  ],
  [
    'viewer',
    'Нигора',
    'Саидова',
    'n.saidova@globalexpo.uz',
    '+998 93 555-12-40',
    'viewer',
    null,
  ],
  [
    'manager',
    'Ольга',
    'Ким',
    'o.kim@globalexpo.uz',
    '+998 91 234-56-78',
    'admin',
    null,
  ],
  [
    'adv',
    'Тимур',
    'Рахимов',
    't.rakhimov@artel.uz',
    '+998 97 700-11-22',
    'advertiser',
    'Artel',
  ],
  [
    'click',
    'Севара',
    'Юсупова',
    's.yusupova@click.uz',
    '+998 99 810-20-30',
    'advertiser',
    'Click',
  ],
]

export const SHEETS = [
  { code: 'ss1uzb', title: '2.1) SS1 UZB TV', kind: 'spot_log' },
  { code: 'ss2uzb', title: '2.2) SS2 UZB TV', kind: 'spot_log' },
  { code: 'live1', title: '1.1) Live Events SS1', kind: 'live_event' },
  { code: 'live2', title: '1.2) Live Events SS2', kind: 'live_event' },
  { code: 'promo1', title: '3.1) Event Promo SS1', kind: 'spot_log' },
  { code: 'promo2', title: '3.2) Event Promo SS2', kind: 'spot_log' },
  { code: 'social', title: '4.1) Social Media', kind: 'social' },
]

const EVENTS = [
  ['Premier League', 'Arsenal - Chelsea'],
  ['LaLiga', 'Real Madrid - Sevilla'],
  ['Premier League', 'Liverpool - Leeds'],
  ['Serie A', 'Inter - Juventus'],
  ['LaLiga', 'Barcelona - Valencia'],
  ['Premier League', 'Manchester City - Tottenham'],
]
const TIMES = [
  '09:15:00',
  '12:40:00',
  '15:05:00',
  '18:30:00',
  '20:45:00',
  '22:10:00',
]

/** Шесть строк на лист — на каждый день через пять дней месяца. */
function sheetRows(sheet, period, brand, shift) {
  const day = (i) => `${period}-${pad(1 + i * 5)}`
  const tag = brand.toUpperCase()
  const rows = Array.from({ length: 6 }, (_, i) => i)
  if (sheet.kind === 'spot_log') {
    const item = sheet.code.startsWith('promo')
      ? `${tag} - EVENT PROMO - 15 Sec`
      : `${tag} - 3 PER DAY - 30 Sec - UZB TV`
    return rows.map((i) => ({
      item,
      date: day(i),
      time: TIMES[(i + shift) % TIMES.length],
    }))
  }
  if (sheet.kind === 'live_event') {
    return rows.map((i) => {
      const [tournament, event] = EVENTS[(i + shift) % EVENTS.length]
      return { date: day(i), time: '20:00:00', tournament, event }
    })
  }
  return rows.map((i) => ({
    network: i < 3 ? 'instagram' : 'telegram',
    link:
      i < 3
        ? `https://www.instagram.com/p/GlobalExpo${shift}${i}/`
        : `https://t.me/globalexpo_uz/${1400 + shift * 10 + i}`,
    impressions: 18_000 + (((i + 1) * 7_300 + shift * 2_100) % 40_000),
  }))
}

/** Месяцы от начала до конца включительно: `2026-01`, `2026-02`, … */
function monthsBetween(start, end) {
  const out = []
  let [y, m] = start.slice(0, 7).split('-').map(Number)
  const [ey, em] = end.slice(0, 7).split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${pad(m)}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/** Свежая база: сущности с id, счётчики id и файлы. */
export function buildSeed() {
  const db = {
    seq: {},
    users: [],
    advertisers: [],
    contracts: [],
    campaigns: [],
    files: [],
    reports: [],
    imports: [],
    packages: [],
  }
  const nextId = (kind) => (db.seq[kind] = (db.seq[kind] ?? 0) + 1)
  const addFile = (file) => {
    const stored = { id: nextId('file'), size: 0, ...file }
    db.files.push(stored)
    return stored.id
  }

  ADVERTISERS.forEach((a, i) => {
    db.advertisers.push({
      id: nextId('advertiser'),
      ...a,
      status: 'active',
      balance: money(1_500_000 + i * 850_000),
      logoFileId: null,
      requisites: [
        `ИНН: ${301245670 + i * 1117}`,
        'Банк: АКБ «Капиталбанк», г. Ташкент',
        `Р/с: 2020800040072149${pad(60 + i)}01`,
        'МФО: 00440',
        'Адрес: г. Ташкент, ул. Амира Темура, 107Б',
      ].join('\n'),
      version: 1,
    })
  })
  const brand = (name) => db.advertisers.find((a) => a.name === name)

  CONTRACTS.forEach((row, idx) => {
    const { key, name, since, paymentDate, budget, spent, scan, spot } = row
    const adv = brand(row.brand)
    const start = `${since}-01`
    const contract = {
      id: nextId('contract'),
      advertiserId: adv.id,
      number: key,
      campaignName: name,
      legalName: adv.legalName,
      package: row.package,
      exhibition: row.exhibition,
      // Площадь стенда в м² — по пакету договора.
      standArea: { standard: 26, vip: 32, platinum: 55 }[row.package] ?? null,
      paymentDate,
      status: 'active',
      budget: money(budget),
      spent: money(spent),
      paymentStatus: '',
      paymentStatusAt: null,
      paymentStatusByPeriod: {},
      payments: [],
      paymentLog: [],
      fileId: scan
        ? addFile({
            name: `Договор_${adv.name.replace(/\s+/g, '_')}_${idx + 1}.docx`,
            kind: 'contract',
            href: CONTRACT_SCAN,
            addedAt: `${start}T11:00:00+05:00`,
          })
        : null,
      creativeId: spot
        ? addFile({
            name: `${adv.name.toLowerCase().replace(/[^a-z]+/g, '-')}-spot-30s.mp4`,
            kind: 'creative',
            href: DEMO_SPOT,
            addedAt: `${start}T16:00:00+05:00`,
          })
        : null,
      paymentSeq: 0,
      version: 1,
    }

    // Оплачено двумя траншами: предоплата и остаток.
    const first = Math.round(spent * 0.6)
    ;[
      [first, `${start}T10:30:00+05:00`, 'Предоплата по договору'],
      [spent - first, `${TODAY.slice(0, 7)}-0${2 + idx}T14:20:00+05:00`, ''],
    ].forEach(([amount, paidAt, comment]) => {
      contract.payments.push({
        id: nextId('payment'),
        amount: money(amount),
        paidAt,
        seq: (contract.paymentSeq += 1),
        comment,
        createdBy: ADMIN,
      })
    })

    // Статус оплаты по месяцам: прошлые оплачены, текущий ждёт денег.
    monthsBetween(start, TODAY).forEach((period, i, all) => {
      const paid = i < all.length - 1
      const opened = `${period}-03T10:00:00+05:00`
      const closed = `${period}-20T12:00:00+05:00`
      contract.paymentLog.push({
        id: nextId('statusEntry'),
        period,
        status: 'awaiting',
        changedAt: opened,
        by: ADMIN,
      })
      if (paid) {
        contract.paymentLog.push({
          id: nextId('statusEntry'),
          period,
          status: 'paid',
          changedAt: closed,
          by: ADMIN,
        })
      }
      contract.paymentStatusByPeriod[period] = paid
        ? { status: 'paid', changedAt: closed }
        : { status: 'awaiting', changedAt: opened }
    })
    db.contracts.push(contract)
  })
  const contractBy = (number) => db.contracts.find((c) => c.number === number)

  /** Файлы фото и видео отчёта стенда — в общем хранилище, как сканы. */
  const reportFiles = (number, endDate) =>
    (STAND_REPORTS[number] ?? []).map((name, i) =>
      addFile(
        name === 'video'
          ? {
              name: 'Видеообзор стенда.mp4',
              kind: 'stand_report',
              href: DEMO_SPOT,
              addedAt: `${endDate}T18:${pad(10 + i)}:00+05:00`,
            }
          : {
              name: `Фото стенда ${i + 1}.webp`,
              kind: 'stand_report',
              href: `/stand-reports/${name}`,
              addedAt: `${endDate}T18:${pad(10 + i)}:00+05:00`,
            },
      ),
    )

  CAMPAIGNS.forEach((row) => {
    const [
      number,
      name,
      status,
      objective,
      startDate,
      endDate,
      impressions,
      createdAt,
    ] = row
    const contract = contractBy(number)
    const creative = db.files.find((f) => f.id === contract.creativeId)
    const clicks = Math.round(impressions * 0.02)
    db.campaigns.push({
      id: nextId('campaign'),
      advertiserId: contract.advertiserId,
      name,
      status,
      objective,
      startDate,
      endDate,
      channelIds: [1, 2],
      impressions,
      clicks,
      conversions: Math.round(clicks * 0.08),
      creativeUrl: creative ? '' : DEMO_SPOT,
      creativeName: creative?.name ?? 'global-expo-demo.mp4',
      creativeAddedAt: creative?.addedAt ?? createdAt,
      creativeId: creative?.id ?? null,
      standReportIds: reportFiles(number, endDate),
      contractNumber: number,
      legalName: contract.legalName,
      paymentDate: contract.paymentDate,
      createdAt,
      version: 1,
    })
  })

  REPORTS.forEach(([number, period, at, by], shift) => {
    const contract = contractBy(number)
    const adv = db.advertisers.find((a) => a.id === contract.advertiserId)
    const report = {
      id: nextId('report'),
      contractId: contract.id,
      period,
      updatedAt: at,
      sheets: SHEETS.map((sheet) => ({
        ...sheet,
        version: 1,
        rows: sheetRows(sheet, period, adv.name, shift),
      })),
    }
    db.reports.push(report)
    db.imports.push({
      id: nextId('import'),
      contractId: contract.id,
      period,
      at,
      by,
      // Исходник загрузки собирается из самого отчёта, когда его скачивают.
      fileId: addFile({
        name: `Отчёт_${adv.name.replace(/\s+/g, '_')}_${period}.xlsx`,
        kind: 'report',
        reportId: report.id,
        addedAt: at,
      }),
      rowCounts: Object.fromEntries(
        report.sheets.map((s) => [s.code, s.rows.length]),
      ),
    })
  })

  USERS.forEach(
    ([login, firstName, lastName, email, phone, role, brandName], i) => {
      db.users.push({
        id: nextId('user'),
        login,
        // Демо-вход: пароль совпадает с логином.
        password: login,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone,
        role,
        advertiserId: brandName ? brand(brandName).id : null,
        isActive: true,
        createdAt: `2025-10-${pad(1 + i * 3)}T09:00:00+05:00`,
        version: 1,
      })
    },
  )

  PACKAGE_CATALOG.forEach(({ photos, price, ...item }, position) => {
    db.packages.push({
      ...item,
      position,
      price: money(price),
      features: [...item.features],
      photoIds: photos.map((name, i) =>
        addFile({
          name: `${item.name} ${i + 1}.webp`,
          kind: 'package_photo',
          href: `/stand-reports/${name}`,
          addedAt: '2026-01-15T10:00:00+05:00',
        }),
      ),
      version: 1,
    })
  })

  return db
}

/** Строки нового отчёта при загрузке файла — демо-данные вместо разбора. */
export function reportRows(period, brand, shift) {
  return SHEETS.map((sheet) => ({
    ...sheet,
    rows: sheetRows(sheet, period, brand, shift),
  }))
}
