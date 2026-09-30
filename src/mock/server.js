/**
 * Бэкенд в браузере: отвечает на те же запросы, что и API (/api/v1), теми же
 * формами ответов, но из локальных демо-данных. В сеть ничего не уходит.
 *
 * Транспорт (src/api/client.ts) зовёт mockFetch вместо fetch, поэтому экраны
 * и хуки запросов не знают, что сервера нет. Изменения сохраняются в
 * localStorage и переживают перезагрузку; сбросить данные — resetMockDb().
 *
 * Демо-входы: admin/admin, viewer/viewer, manager/manager,
 * adv/adv (Artel), click/click (Click).
 */
import { buildXlsxBook } from '@/lib/xlsx.js'
import { buildSeed, reportRows, SHEETS, TODAY } from './seed.js'

const STORAGE_KEY = 'globalexpo.mock.v2'
const PREFIX = '/api/v1'
/** Небольшая задержка, чтобы ожидание выглядело как у настоящего сервера. */
const LATENCY_MS = 150
/** Файлы до этого размера храним целиком и после перезагрузки. */
const PERSIST_FILE_LIMIT = 1.5 * 1024 * 1024
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const REQUIRED = 'Обязательное поле.'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/

/* ----------------------------- база и хранение --------------------------- */

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Повреждённая или недоступная запись — начинаем с демо-данных.
  }
  return buildSeed()
}

let db = load()

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Хранилище переполнено загруженными файлами — их содержимое держим
    // только до перезагрузки, остальное сохраняем.
    const light = {
      ...db,
      files: db.files.map((f) => (f.persisted ? { ...f, href: null } : f)),
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(light))
    } catch {
      /* приватный режим — живём в памяти */
    }
  }
}

/** Вернуть демо-данные к исходным. */
export function resetMockDb() {
  db = buildSeed()
  save()
}

const nextId = (kind) => (db.seq[kind] = (db.seq[kind] ?? 0) + 1)
const money = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2)
const isStr = (v) => typeof v === 'string'
const alive = (entity) => entity && !entity.deletedAt

/** Время Ташкента (UTC+5) — сервер отвечает с `+05:00`. */
function toLocalIso(date) {
  const shifted = new Date(date.getTime() + 5 * 3600 * 1000)
  return shifted.toISOString().replace(/\.\d{3}Z$/, '+05:00')
}
const nowIso = () => toLocalIso(new Date())

function normalizeDateTime(value) {
  if (!isStr(value) || !value.trim()) return null
  let v = value.trim()
  if (DATE_RE.test(v)) v += 'T00:00:00+05:00'
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(v))
    v += '+05:00'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : toLocalIso(d)
}

function validDate(v) {
  if (!isStr(v) || !DATE_RE.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v
}

/* --------------------------------- ошибки -------------------------------- */

class HttpError extends Error {
  constructor(status, code, message, fields = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

const unauthorized = () =>
  new HttpError(401, 'unauthorized', 'Сессия истекла, войдите заново')
const forbidden = () =>
  new HttpError(403, 'forbidden', 'Недостаточно прав для этого действия')
const notFound = (message = 'Не найдено') =>
  new HttpError(404, 'not_found', message)
const invalid = (fields, message = 'Проверьте заполнение полей') =>
  new HttpError(400, 'validation_error', message, fields)

function finish(errors) {
  if (Object.keys(errors).length) throw invalid(errors)
}

function checkVersion(entity, body) {
  if (body?.version != null && Number(body.version) !== entity.version) {
    throw new HttpError(
      409,
      'version_conflict',
      'Данные изменились, обновите страницу',
    )
  }
}

/* --------------------------------- файлы --------------------------------- */

/** Ссылки на файлы, которые живут только до перезагрузки: крупные загрузки
    и собранные на лету xlsx отчётов. */
const sessionUrls = new Map()

function fileUrl(file) {
  if (file.href) return file.href
  if (sessionUrls.has(file.id)) return sessionUrls.get(file.id)
  if (file.kind === 'report') {
    const report = db.reports.find((r) => r.id === file.reportId)
    if (!report) return null
    const url = URL.createObjectURL(reportWorkbook(report.sheets))
    sessionUrls.set(file.id, url)
    return url
  }
  return null
}

const fileById = (id) =>
  id == null ? null : (db.files.find((f) => f.id === id) ?? null)

/** AttachedFile: `{ name, url, addedAt }` — или null, если содержимого нет. */
function attached(fileId) {
  const file = fileById(fileId)
  const url = file && fileUrl(file)
  return url ? { name: file.name, url, addedAt: file.addedAt } : null
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Сохранить загруженный файл: мелкий — целиком, крупный — до перезагрузки. */
async function storeUpload(file, kind) {
  const stored = {
    id: nextId('file'),
    name: file.name || 'file',
    mime: file.type || 'application/octet-stream',
    kind,
    size: file.size,
    addedAt: nowIso(),
    href: null,
    persisted: false,
  }
  if (file.size <= PERSIST_FILE_LIMIT) {
    stored.href = await readAsDataUrl(file)
    stored.persisted = true
  } else {
    sessionUrls.set(stored.id, URL.createObjectURL(file))
  }
  db.files.push(stored)
  return stored
}

const extOf = (name) => (/\.([^.]+)$/.exec(name ?? '')?.[1] ?? '').toLowerCase()

const FILE_RULES = {
  logo: {
    accept: (mime, ext) =>
      mime.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext),
    message: 'Логотип должен быть изображением.',
  },
  creative: {
    accept: (mime, ext) =>
      mime.startsWith('video/') ||
      ['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext),
    message: 'Ролик должен быть видеофайлом.',
  },
  contract: {
    accept: (_, ext) =>
      ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'].includes(ext),
    message: 'Договор — PDF, Word или скан-картинка.',
  },
}

/* -------------------------------- отчёты --------------------------------- */

const REPORT_COLUMNS = {
  spot_log: [
    ['ITEM NAME', 'item'],
    ['DATE', 'date'],
    ['TIME', 'time'],
  ],
  live_event: [
    ['DATE', 'date'],
    ['TIME', 'time'],
    ['TOURNAMENT', 'tournament'],
    ['EVENT', 'event'],
  ],
  social: [
    ['NETWORK', 'network'],
    ['LINK', 'link'],
    ['IMPRESSIONS', 'impressions'],
  ],
}

function reportWorkbook(sheets) {
  return buildXlsxBook({
    sheets: sheets.map((sheet) => {
      const columns = REPORT_COLUMNS[sheet.kind]
      return {
        name: sheet.title,
        rows: [
          columns.map(([title]) => title),
          ...sheet.rows.map((row) => columns.map(([, key]) => row[key])),
        ],
      }
    }),
  })
}

function serializeSheet(sheet) {
  const out = {
    code: sheet.code,
    title: sheet.title,
    kind: sheet.kind,
    version: sheet.version,
    rows: sheet.rows.map((row) => ({ ...row })),
  }
  if (sheet.kind === 'social') {
    out.totals = { instagram: 0, telegram: 0 }
    for (const row of sheet.rows) out.totals[row.network] += row.impressions
  }
  return out
}

/** PUT …/sheets/:code — строки листа с проверкой, как на сервере. */
function validateSheetRows(kind, rows) {
  if (!Array.isArray(rows)) throw invalid({ rows: 'Ожидается список строк.' })
  const fields = {}
  const out = rows.map((row, i) => {
    const key = (f) => `rows[${i}].${f}`
    const src = row && typeof row === 'object' ? row : {}
    const text = (f, required = false) => {
      const v = src[f] == null ? '' : String(src[f]).trim()
      if (required && !v) fields[key(f)] = REQUIRED
      return v
    }
    const date = () => {
      if (!validDate(src.date)) {
        fields[key('date')] =
          'Неправильный формат даты. Используйте YYYY-MM-DD.'
      }
      return src.date
    }
    const time = () => {
      const match = isStr(src.time) ? TIME_RE.exec(src.time.trim()) : null
      if (!match) {
        fields[key('time')] =
          'Неправильный формат времени. Используйте HH:MM или HH:MM:SS.'
        return src.time
      }
      return `${match[1]}:${match[2]}:${match[4] ?? '00'}`
    }
    if (kind === 'spot_log') {
      return { item: text('item', true), date: date(), time: time() }
    }
    if (kind === 'live_event') {
      return {
        date: date(),
        time: time(),
        tournament: text('tournament'),
        event: text('event'),
      }
    }
    if (!['instagram', 'telegram'].includes(src.network)) {
      fields[key('network')] = 'Выберите Instagram или Telegram.'
    }
    const impressions = Number(src.impressions)
    if (!Number.isInteger(impressions) || impressions < 0) {
      fields[key('impressions')] = 'Введите целое число от нуля.'
    }
    return { network: src.network, link: text('link', true), impressions }
  })
  finish(fields)
  return out
}

function lastImportOf(contractId, period) {
  return (
    db.imports
      .filter((i) => i.contractId === contractId && i.period === period)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id - a.id)[0] ??
    null
  )
}

function serializeImport(i) {
  return {
    id: i.id,
    period: i.period,
    at: i.at,
    by: i.by,
    file: attached(i.fileId),
    rowCounts: { ...i.rowCounts },
  }
}

/** Историю загрузок видит только площадка (admin). */
function serializeReport(report, user) {
  const last =
    user.role === 'admin'
      ? lastImportOf(report.contractId, report.period)
      : null
  return {
    id: report.id,
    contractId: report.contractId,
    period: report.period,
    updatedAt: report.updatedAt,
    sheets: report.sheets.map(serializeSheet),
    lastImport: last ? serializeImport(last) : null,
  }
}

/* ------------------------------ сериализация ----------------------------- */

const liveContracts = () =>
  db.contracts.filter(
    (c) =>
      alive(c) && alive(db.advertisers.find((a) => a.id === c.advertiserId)),
  )

function recomputeLatestStatus(contract) {
  let latest = null
  for (const entry of Object.values(contract.paymentStatusByPeriod)) {
    if (!latest || Date.parse(entry.changedAt) >= Date.parse(latest.changedAt))
      latest = entry
  }
  contract.paymentStatus = latest?.status ?? ''
  contract.paymentStatusAt = latest?.changedAt ?? null
}

const serializeUser = (u) => ({
  id: u.id,
  role: u.role,
  name: u.name,
  email: u.email,
  advertiserId: u.advertiserId,
})

const serializeManagedUser = (u) => ({
  id: u.id,
  login: u.login,
  name: u.name,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  role: u.role,
  advertiserId: u.advertiserId,
  isActive: u.isActive,
  createdAt: u.createdAt,
  version: u.version,
})

function serializeContract(c) {
  recomputeLatestStatus(c)
  return {
    id: c.id,
    advertiserId: c.advertiserId,
    number: c.number,
    campaignName: c.campaignName,
    legalName: c.legalName,
    paymentDate: c.paymentDate,
    status: c.status,
    budget: c.budget,
    spent: c.spent,
    paymentStatus: c.paymentStatus,
    paymentStatusAt: c.paymentStatusAt,
    paymentStatusByPeriod: structuredClone(c.paymentStatusByPeriod),
    // Поступления — от первого к последнему, журнал статусов — наоборот.
    payments: [...c.payments]
      .sort(
        (a, b) => Date.parse(a.paidAt) - Date.parse(b.paidAt) || a.seq - b.seq,
      )
      .map((p) => ({ ...p })),
    paymentLog: [...c.paymentLog]
      .sort(
        (a, b) =>
          Date.parse(b.changedAt) - Date.parse(a.changedAt) || b.id - a.id,
      )
      .map((e) => ({ ...e })),
    file: attached(c.fileId),
    creative: attached(c.creativeId),
    version: c.version,
  }
}

const serializeAdvertiser = (a) => ({
  id: a.id,
  name: a.name,
  contact: a.contact,
  email: a.email,
  category: a.category,
  status: a.status,
  legalName: a.legalName,
  balance: a.balance,
  color: a.color,
  logo: a.logo,
  logoFile: attached(a.logoFileId),
  requisites: a.requisites,
  campaignsCount: db.campaigns.filter((c) => c.advertiserId === a.id).length,
  contracts: db.contracts
    .filter((c) => c.advertiserId === a.id && alive(c))
    .map(serializeContract),
  createdAt: a.createdAt,
  version: a.version,
})

const serializeCampaign = (c) => ({
  id: c.id,
  advertiserId: c.advertiserId,
  name: c.name,
  status: c.status,
  objective: c.objective,
  startDate: c.startDate,
  endDate: c.endDate,
  channelIds: [...c.channelIds],
  impressions: c.impressions,
  clicks: c.clicks,
  conversions: c.conversions,
  creativeUrl: c.creativeUrl,
  creativeName: c.creativeName,
  creativeAddedAt: c.creativeAddedAt,
  creative: attached(c.creativeId),
  contractNumber: c.contractNumber,
  legalName: c.legalName,
  paymentDate: c.paymentDate,
  createdAt: c.createdAt,
  version: c.version,
})

const serializeStoredFile = (f) => ({
  id: f.id,
  name: f.name,
  url: fileUrl(f),
  size: f.size,
  mime: f.mime,
  addedAt: f.addedAt,
})

/** Данных мало — отдаём выборку одной страницей. */
const page = (items) => ({ items, nextCursor: null, total: items.length })

const newestFirst = (a, b) =>
  Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id

/* ------------------------------ чтение тела ------------------------------ */

/**
 * Типизированное чтение полей тела в черновик. Ошибки копятся в `errors`,
 * а не бросаются сразу — так форма получает их все разом.
 */
function reader(body, draft, errors, creating) {
  const b = body && typeof body === 'object' ? body : {}
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k)
  const skip = (k, required) => {
    if (has(k)) return false
    if (creating && required) errors[k] = REQUIRED
    return true
  }
  return {
    has,
    str(k, { required = false } = {}) {
      if (skip(k, required)) return
      const v = b[k] == null ? '' : String(b[k]).trim()
      if (required && !v) errors[k] = REQUIRED
      else draft[k] = v
    },
    email(k, { required = false } = {}) {
      this.str(k, { required })
      if (!errors[k] && draft[k] && has(k) && !EMAIL_RE.test(draft[k])) {
        errors[k] = 'Введите правильный адрес электронной почты.'
      }
    },
    oneOf(k, values) {
      if (skip(k)) return
      if (!values.includes(b[k])) errors[k] = 'Недопустимое значение.'
      else draft[k] = b[k]
    },
    date(k, { required = false } = {}) {
      if (skip(k, required)) return
      if ((b[k] === null || b[k] === '') && !required) draft[k] = null
      else if (!validDate(b[k])) errors[k] = 'Неправильный формат даты.'
      else draft[k] = b[k]
    },
    dateTime(k) {
      if (!has(k)) return
      if (b[k] === null || b[k] === '') return void (draft[k] = null)
      const v = normalizeDateTime(b[k])
      if (!v) errors[k] = 'Неправильный формат даты и времени.'
      else draft[k] = v
    },
    int(k) {
      if (!has(k)) return
      const v = Number(b[k])
      if (!Number.isInteger(v) || v < 0) errors[k] = 'Введите целое число.'
      else draft[k] = v
    },
    amount(k) {
      if (!has(k) || b[k] === '' || b[k] === null) return
      const v = Number(b[k])
      if (!Number.isFinite(v) || v < 0) errors[k] = 'Введите сумму от нуля.'
      else draft[k] = money(v)
    },
    bool(k) {
      if (has(k)) draft[k] = !!b[k]
    },
    list(k) {
      if (!has(k)) return
      draft[k] = Array.isArray(b[k]) ? [...b[k]] : []
    },
    fileRef(k, to) {
      if (!has(k)) return
      if (b[k] === null) return void (draft[to] = null)
      const file = fileById(Number(b[k]))
      if (!file) errors[k] = 'Файл не найден.'
      else draft[to] = file.id
    },
  }
}

/* --------------------------- доступ и поиск ------------------------------ */

function requireRole(ctx, ...roles) {
  if (!roles.includes(ctx.user.role)) throw forbidden()
}
const requireAdmin = (ctx) => requireRole(ctx, 'admin')

function intParam(value) {
  if (!/^\d+$/.test(value ?? '')) throw notFound()
  return Number(value)
}

function getAdvertiser(ctx, id) {
  const adv = db.advertisers.find((a) => a.id === id && alive(a))
  const foreign =
    ctx.user.role === 'advertiser' && ctx.user.advertiserId !== adv?.id
  if (!adv || foreign) throw notFound('Рекламодатель не найден')
  return adv
}

function getContract(ctx, id) {
  const contract = liveContracts().find((c) => c.id === id)
  const foreign =
    ctx.user.role === 'advertiser' &&
    ctx.user.advertiserId !== contract?.advertiserId
  if (!contract || foreign) throw notFound('Договор не найден')
  return contract
}

function getCampaign(ctx, id) {
  const campaign = db.campaigns.find((c) => c.id === id)
  const foreign =
    ctx.user.role === 'advertiser' &&
    ctx.user.advertiserId !== campaign?.advertiserId
  if (!campaign || foreign) throw notFound('Кампания не найдена')
  return campaign
}

/* --------------------------------- токены -------------------------------- */

// Токен несёт id пользователя — сессия переживает перезагрузку страницы.
const issueTokens = (user) => {
  const nonce = Math.random().toString(36).slice(2, 10)
  return {
    access: `acc.${user.id}.${nonce}`,
    refresh: `ref.${user.id}.${nonce}`,
  }
}

function userFromToken(token, kind) {
  const match = /^(acc|ref)\.(\d+)\.\w+$/.exec(token ?? '')
  if (!match || match[1] !== kind) return null
  const user = db.users.find((u) => u.id === Number(match[2]) && alive(u))
  return user?.isActive ? user : null
}

/* -------------------------------- маршруты ------------------------------- */

const routes = []
function route(method, pattern, handler, { auth = true } = {}) {
  const keys = []
  const source = pattern.replace(/:(\w+)/g, (_, key) => {
    keys.push(key)
    return '([^/]+)'
  })
  routes.push({
    method,
    re: new RegExp(`^${source}/?$`),
    keys,
    handler,
    auth,
  })
}

/* --- вход --- */

route(
  'POST',
  '/auth/login',
  ({ body }) => {
    const login = isStr(body?.login) ? body.login.trim().toLowerCase() : ''
    const fields = {}
    if (!login) fields.login = REQUIRED
    if (!body?.password) fields.password = REQUIRED
    finish(fields)
    const user = db.users.find((u) => alive(u) && u.login === login)
    if (!user || user.password !== body.password) {
      throw new HttpError(
        401,
        'invalid_credentials',
        'Неверный логин или пароль',
      )
    }
    if (!user.isActive) {
      throw new HttpError(401, 'account_disabled', 'Учётная запись отключена')
    }
    return { ...issueTokens(user), user: serializeUser(user) }
  },
  { auth: false },
)

route(
  'POST',
  '/auth/refresh',
  ({ body }) => {
    const user = userFromToken(body?.refresh, 'ref')
    if (!user) throw unauthorized()
    return issueTokens(user)
  },
  { auth: false },
)

route('POST', '/auth/logout', () => undefined, { auth: false })

route('GET', '/auth/me', ({ user }) => ({ user: serializeUser(user) }))

/* --- рекламодатели --- */

function applyAdvertiser(target, body, creating) {
  const draft = { ...target }
  const errors = {}
  const r = reader(body, draft, errors, creating)
  r.str('name', { required: true })
  r.str('contact')
  r.email('email', { required: true })
  r.str('category')
  r.oneOf('status', ['active', 'paused'])
  r.str('legalName')
  r.amount('balance')
  r.str('color')
  r.str('requisites')
  if (r.has('logo')) draft.logo = body.logo?.trim() || null
  r.fileRef('logoId', 'logoFileId')
  finish(errors)
  return draft
}

route('GET', '/advertisers', (ctx) => {
  requireRole(ctx, 'admin', 'viewer')
  const q = (ctx.query.get('q') ?? '').trim().toLowerCase()
  const items = db.advertisers
    .filter(alive)
    .filter((a) => !q || a.name.toLowerCase().includes(q))
    .sort(newestFirst)
  return page(items.map(serializeAdvertiser))
})

route('POST', '/advertisers', (ctx) => {
  requireAdmin(ctx)
  const draft = applyAdvertiser(
    {
      contact: '',
      category: '',
      status: 'active',
      legalName: '',
      balance: '0.00',
      color: '#0E7745',
      logo: null,
      logoFileId: null,
      requisites: '',
    },
    ctx.body,
    true,
  )
  const adv = {
    ...draft,
    id: nextId('advertiser'),
    createdAt: nowIso(),
    version: 1,
  }
  db.advertisers.push(adv)
  return created(serializeAdvertiser(adv))
})

route('GET', '/advertisers/:id', (ctx) =>
  serializeAdvertiser(getAdvertiser(ctx, intParam(ctx.params.id))),
)

route('PATCH', '/advertisers/:id', (ctx) => {
  requireAdmin(ctx)
  const adv = getAdvertiser(ctx, intParam(ctx.params.id))
  checkVersion(adv, ctx.body)
  Object.assign(adv, applyAdvertiser(adv, ctx.body, false))
  adv.version += 1
  return serializeAdvertiser(adv)
})

route('DELETE', '/advertisers/:id', (ctx) => {
  requireAdmin(ctx)
  getAdvertiser(ctx, intParam(ctx.params.id)).deletedAt = nowIso()
})

/* --- договоры --- */

function applyContract(target, body, creating) {
  const draft = { ...target }
  const errors = {}
  const r = reader(body, draft, errors, creating)
  // Внутренний ключ договора: его присылает фронт, людям он не виден.
  r.str('number', { required: true })
  if (!errors.number && draft.number) {
    const taken = liveContracts().some(
      (c) => c.id !== target.id && c.number === draft.number,
    )
    if (taken) errors.number = 'Такой договор уже существует.'
  }
  r.str('campaignName')
  r.str('legalName')
  r.date('paymentDate')
  r.oneOf('status', ['active', 'completed', 'terminated'])
  r.fileRef('fileId', 'fileId')
  r.fileRef('creativeId', 'creativeId')
  finish(errors)
  return draft
}

route('POST', '/advertisers/:id/contracts', (ctx) => {
  requireAdmin(ctx)
  const adv = getAdvertiser(ctx, intParam(ctx.params.id))
  const draft = applyContract(
    {
      id: null,
      campaignName: '',
      legalName: adv.legalName,
      paymentDate: null,
      status: 'active',
      fileId: null,
      creativeId: null,
    },
    ctx.body,
    true,
  )
  const contract = {
    ...draft,
    legalName: draft.legalName || adv.legalName,
    id: nextId('contract'),
    advertiserId: adv.id,
    budget: '0.00',
    spent: '0.00',
    paymentStatus: '',
    paymentStatusAt: null,
    paymentStatusByPeriod: {},
    payments: [],
    paymentLog: [],
    paymentSeq: 0,
    version: 1,
  }
  db.contracts.push(contract)
  return created(serializeContract(contract))
})

function brandContract(ctx) {
  const adv = getAdvertiser(ctx, intParam(ctx.params.advertiserId))
  const contract = getContract(ctx, intParam(ctx.params.id))
  if (contract.advertiserId !== adv.id) throw notFound('Договор не найден')
  return contract
}

function patchContract(contract, body) {
  checkVersion(contract, body)
  Object.assign(contract, applyContract(contract, body, false))
  contract.version += 1
  return serializeContract(contract)
}

route('PATCH', '/advertisers/:advertiserId/contracts/:id', (ctx) => {
  requireAdmin(ctx)
  return patchContract(brandContract(ctx), ctx.body)
})

route('DELETE', '/advertisers/:advertiserId/contracts/:id', (ctx) => {
  requireAdmin(ctx)
  brandContract(ctx).deletedAt = nowIso()
})

route('PATCH', '/contracts/:id', (ctx) => {
  requireAdmin(ctx)
  return patchContract(getContract(ctx, intParam(ctx.params.id)), ctx.body)
})

route('PATCH', '/contracts/:id/campaign-info', (ctx) => {
  requireRole(ctx, 'admin', 'advertiser')
  const contract = getContract(ctx, intParam(ctx.params.id))
  const draft = { ...contract }
  const errors = {}
  const r = reader(ctx.body, draft, errors, false)
  r.str('campaignName')
  r.fileRef('creativeId', 'creativeId')
  finish(errors)
  contract.campaignName = draft.campaignName
  contract.creativeId = draft.creativeId
  contract.version += 1
  return serializeContract(contract)
})

route('PATCH', '/contracts/:id/amounts', (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const draft = {}
  const errors = {}
  const r = reader(ctx.body, draft, errors, false)
  r.amount('budget')
  r.amount('spent')
  r.dateTime('paidAt')
  finish(errors)
  if (draft.budget !== undefined) contract.budget = draft.budget
  if (draft.spent !== undefined) {
    // Рост «оплачено» записывается поступлением, уменьшение — нет.
    const gained = Number(draft.spent) - Number(contract.spent)
    if (gained > 0) {
      contract.payments.push({
        id: nextId('payment'),
        amount: money(gained),
        paidAt: draft.paidAt ?? nowIso(),
        seq: (contract.paymentSeq += 1),
        comment: '',
        createdBy: ctx.user.name,
      })
    }
    contract.spent = draft.spent
  }
  contract.version += 1
  return serializeContract(contract)
})

route('PUT', '/contracts/:id/payment-status', (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const { status, period, changedAt: at } = ctx.body ?? {}
  const fields = {}
  if (!['awaiting', 'paid'].includes(status)) fields.status = 'Выберите статус.'
  if (!PERIOD_RE.test(period ?? '')) fields.period = 'Укажите месяц YYYY-MM.'
  const changedAt = at ? normalizeDateTime(at) : nowIso()
  if (!changedAt) fields.changedAt = 'Неправильный формат даты и времени.'
  finish(fields)
  contract.paymentStatusByPeriod[period] = { status, changedAt }
  contract.paymentLog.push({
    id: nextId('statusEntry'),
    period,
    status,
    changedAt,
    by: ctx.user.name,
  })
  contract.version += 1
  return serializeContract(contract)
})

function paymentOf(contract, id) {
  const payment = contract.payments.find((p) => p.id === intParam(id))
  if (!payment) throw notFound('Поступление не найдено')
  return payment
}

route('PATCH', '/contracts/:id/payments/:paymentId', (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const payment = paymentOf(contract, ctx.params.paymentId)
  const draft = {}
  const errors = {}
  const r = reader(ctx.body, draft, errors, false)
  r.amount('amount')
  r.dateTime('paidAt')
  r.str('comment')
  finish(errors)
  if (draft.amount !== undefined) {
    contract.spent = money(
      Number(contract.spent) + Number(draft.amount) - Number(payment.amount),
    )
    payment.amount = draft.amount
  }
  if (draft.paidAt) payment.paidAt = draft.paidAt
  if (draft.comment !== undefined) payment.comment = draft.comment
  contract.version += 1
  return serializeContract(contract)
})

route('DELETE', '/contracts/:id/payments/:paymentId', (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const payment = paymentOf(contract, ctx.params.paymentId)
  contract.payments = contract.payments.filter((p) => p !== payment)
  contract.spent = money(
    Math.max(0, Number(contract.spent) - Number(payment.amount)),
  )
  contract.version += 1
  return serializeContract(contract)
})

/* --- отчёты --- */

function periodParam(value) {
  if (!PERIOD_RE.test(value ?? '')) throw notFound('Отчёт не найден')
  return value
}

function reportOf(contract, period) {
  const report = db.reports.find(
    (r) => r.contractId === contract.id && r.period === period,
  )
  if (!report) throw notFound('Отчёт за этот месяц не загружен')
  return report
}

route('GET', '/contracts/:id/reports', (ctx) => {
  const contract = getContract(ctx, intParam(ctx.params.id))
  const isAdmin = ctx.user.role === 'admin'
  return db.reports
    .filter((r) => r.contractId === contract.id)
    .sort((a, b) => b.period.localeCompare(a.period))
    .map((r) => {
      const last = isAdmin ? lastImportOf(contract.id, r.period) : null
      return {
        period: r.period,
        updatedAt: r.updatedAt,
        lastImport: last ? serializeImport(last) : null,
      }
    })
})

// Регистрируется раньше `/reports/:period`, иначе «imports» примут за месяц.
route('GET', '/contracts/:id/reports/imports', (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const period = ctx.query.get('period')
  const items = db.imports
    .filter(
      (i) => i.contractId === contract.id && (!period || i.period === period),
    )
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || b.id - a.id)
  return page(items.map(serializeImport))
})

route('GET', '/contracts/:id/reports/:period', (ctx) => {
  const contract = getContract(ctx, intParam(ctx.params.id))
  const report = reportOf(contract, periodParam(ctx.params.period))
  return serializeReport(report, ctx.user)
})

route('POST', '/contracts/:id/reports/:period/import', async (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const period = periodParam(ctx.params.period)
  const file = ctx.form?.get('file')
  if (!(file instanceof File)) throw invalid({ file: 'Файл не был отправлен.' })
  if (extOf(file.name) !== 'xlsx') {
    throw invalid({ file: 'Нужен файл .xlsx.' })
  }
  // Файл не разбираем: месяц заполняется демо-строками, а сам файл
  // остаётся в истории загрузок.
  const adv = db.advertisers.find((a) => a.id === contract.advertiserId)
  const shift = db.imports.filter((i) => i.contractId === contract.id).length
  const at = nowIso()
  let report = db.reports.find(
    (r) => r.contractId === contract.id && r.period === period,
  )
  if (!report) {
    report = {
      id: nextId('report'),
      contractId: contract.id,
      period,
      sheets: SHEETS.map((s) => ({ ...s, version: 0, rows: [] })),
    }
    db.reports.push(report)
  }
  const fresh = reportRows(period, adv.name, shift)
  report.sheets = report.sheets.map((sheet, i) => ({
    ...sheet,
    version: sheet.version + 1,
    rows: fresh[i].rows,
  }))
  report.updatedAt = at
  const stored = await storeUpload(file, 'report')
  db.imports.push({
    id: nextId('import'),
    contractId: contract.id,
    period,
    at,
    by: ctx.user.name,
    fileId: stored.id,
    rowCounts: Object.fromEntries(
      report.sheets.map((s) => [s.code, s.rows.length]),
    ),
  })
  return created(serializeReport(report, ctx.user))
})

route('PUT', '/contracts/:id/reports/:period/sheets/:code', (ctx) => {
  requireAdmin(ctx)
  const contract = getContract(ctx, intParam(ctx.params.id))
  const report = reportOf(contract, periodParam(ctx.params.period))
  const sheet = report.sheets.find((s) => s.code === ctx.params.code)
  if (!sheet) throw notFound('Лист не найден')
  checkVersion(sheet, ctx.body)
  sheet.rows = validateSheetRows(sheet.kind, ctx.body?.rows)
  sheet.version += 1
  report.updatedAt = nowIso()
  return serializeSheet(sheet)
})

route('GET', '/contracts/:id/reports/:period/export', (ctx) => {
  const contract = getContract(ctx, intParam(ctx.params.id))
  const report = reportOf(contract, periodParam(ctx.params.period))
  const name = `Report_${contract.number.replace(/\//g, '-')}_${report.period}.xlsx`
  return new Response(reportWorkbook(report.sheets), {
    status: 200,
    headers: {
      'Content-Type': XLSX_MIME,
      'Content-Disposition': `attachment; filename*=utf-8''${encodeURIComponent(name)}`,
    },
  })
})

/* --- кампании --- */

const CAMPAIGN_STATUSES = [
  'sent',
  'received',
  'reviewing',
  'active',
  'completed',
  'awaiting_payment',
  'paid',
  'archived',
]

/** Условия договора копируются в кампанию на момент привязки. */
function snapshotContract(campaign) {
  const contract = liveContracts().find(
    (c) =>
      c.advertiserId === campaign.advertiserId &&
      c.number === campaign.contractNumber,
  )
  campaign.legalName = contract?.legalName ?? ''
  campaign.paymentDate = contract?.paymentDate ?? null
}

function applyCampaign(target, body, creating) {
  const draft = { ...target }
  const errors = {}
  const r = reader(body, draft, errors, creating)
  r.str('name', { required: true })
  if (!creating) r.oneOf('status', CAMPAIGN_STATUSES)
  r.oneOf('objective', ['awareness', 'traffic', 'conversions', 'reach', ''])
  r.date('startDate', { required: true })
  r.date('endDate', { required: true })
  if (
    draft.startDate &&
    draft.endDate &&
    draft.endDate < draft.startDate &&
    !errors.endDate
  ) {
    errors.endDate = 'Дата окончания не может быть раньше даты начала.'
  }
  r.list('channelIds')
  r.int('impressions')
  r.int('clicks')
  r.int('conversions')
  r.str('creativeUrl')
  r.str('creativeName')
  r.dateTime('creativeAddedAt')
  r.str('contractNumber')
  r.fileRef('creativeId', 'creativeId')
  finish(errors)
  // Загруженный ролик сам даёт имя и дату.
  const file = r.has('creativeId') ? fileById(draft.creativeId) : null
  if (file) {
    draft.creativeName = file.name
    draft.creativeAddedAt = file.addedAt
  }
  return draft
}

route('GET', '/campaigns', (ctx) => {
  const q = (ctx.query.get('q') ?? '').trim().toLowerCase()
  const status = ctx.query.get('status')
  const contractNumber = ctx.query.get('contractNumber')
  const advertiserId =
    ctx.user.role === 'advertiser'
      ? ctx.user.advertiserId
      : Number(ctx.query.get('advertiserId')) || null
  const items = db.campaigns
    .filter((c) => !advertiserId || c.advertiserId === advertiserId)
    .filter((c) => !status || c.status === status)
    .filter((c) => !contractNumber || c.contractNumber === contractNumber)
    .filter((c) => !q || c.name.toLowerCase().includes(q))
    .sort(newestFirst)
  return page(items.map(serializeCampaign))
})

route('GET', '/campaigns/:id', (ctx) =>
  serializeCampaign(getCampaign(ctx, intParam(ctx.params.id))),
)

route('POST', '/campaigns', (ctx) => {
  requireRole(ctx, 'advertiser', 'admin')
  // Рекламодатель подаёт заявку сам, площадка — от имени бренда.
  const own = ctx.user.role === 'advertiser'
  const advertiserId = own
    ? ctx.user.advertiserId
    : Number(ctx.body?.advertiserId) || null
  if (!db.advertisers.some((a) => a.id === advertiserId && alive(a))) {
    throw invalid({ advertiserId: 'Укажите рекламодателя.' })
  }
  const draft = applyCampaign(
    {
      objective: '',
      channelIds: [],
      impressions: 0,
      clicks: 0,
      conversions: 0,
      creativeUrl: '',
      creativeName: '',
      creativeAddedAt: null,
      creativeId: null,
      contractNumber: '',
    },
    ctx.body,
    true,
  )
  const campaign = {
    ...draft,
    advertiserId,
    status: own ? 'sent' : 'received',
    id: nextId('campaign'),
    createdAt: nowIso(),
    version: 1,
  }
  snapshotContract(campaign)
  db.campaigns.push(campaign)
  return created(serializeCampaign(campaign))
})

route('PATCH', '/campaigns/:id', (ctx) => {
  requireAdmin(ctx)
  const campaign = getCampaign(ctx, intParam(ctx.params.id))
  checkVersion(campaign, ctx.body)
  const before = campaign.contractNumber
  Object.assign(campaign, applyCampaign(campaign, ctx.body, false))
  if (campaign.contractNumber !== before) snapshotContract(campaign)
  campaign.version += 1
  return serializeCampaign(campaign)
})

/* --- пользователи --- */

function applyUser(target, body, creating) {
  const draft = { ...target }
  const errors = {}
  const r = reader(body, draft, errors, creating)
  r.str('login', { required: true })
  if (!errors.login && draft.login) {
    draft.login = draft.login.toLowerCase()
    if (!/^[a-z0-9._@+-]+$/.test(draft.login)) {
      errors.login = 'Логин — латиница, цифры и символы . _ @ + -'
    } else if (
      db.users.some(
        (u) => alive(u) && u.id !== target.id && u.login === draft.login,
      )
    ) {
      errors.login = 'Пользователь с таким логином уже существует.'
    }
  }
  if (creating || (r.has('password') && body.password !== '')) {
    if (!isStr(body?.password) || body.password.length < 3) {
      errors.password = 'Пароль — не короче трёх символов.'
    } else draft.password = body.password
  }
  r.str('firstName')
  r.str('lastName')
  r.email('email')
  r.str('phone')
  if (creating && !r.has('role')) errors.role = REQUIRED
  r.oneOf('role', ['admin', 'viewer', 'advertiser'])
  r.bool('isActive')
  if (r.has('advertiserId')) {
    draft.advertiserId = Number(body.advertiserId) || null
  }
  if (draft.role === 'advertiser' && !draft.advertiserId) {
    errors.advertiserId = 'Для роли «Рекламодатель» выберите бренд.'
  }
  if (draft.role !== 'advertiser') draft.advertiserId = null
  finish(errors)
  draft.name =
    [draft.firstName, draft.lastName].filter(Boolean).join(' ') || draft.login
  return draft
}

route('GET', '/users', (ctx) => {
  requireAdmin(ctx)
  const q = (ctx.query.get('q') ?? '').trim().toLowerCase()
  const items = db.users
    .filter(alive)
    .filter(
      (u) =>
        !q ||
        [u.login, u.name, u.email].some((v) =>
          (v ?? '').toLowerCase().includes(q),
        ),
    )
    .sort(newestFirst)
  return page(items.map(serializeManagedUser))
})

route('POST', '/users', (ctx) => {
  requireAdmin(ctx)
  const draft = applyUser(
    {
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      advertiserId: null,
      isActive: true,
    },
    ctx.body,
    true,
  )
  const user = { ...draft, id: nextId('user'), createdAt: nowIso(), version: 1 }
  db.users.push(user)
  return created(serializeManagedUser(user))
})

function userOf(id) {
  const user = db.users.find((u) => u.id === intParam(id) && alive(u))
  if (!user) throw notFound('Пользователь не найден')
  return user
}

route('PATCH', '/users/:id', (ctx) => {
  requireAdmin(ctx)
  const user = userOf(ctx.params.id)
  checkVersion(user, ctx.body)
  Object.assign(user, applyUser(user, ctx.body, false))
  user.version += 1
  return serializeManagedUser(user)
})

route('DELETE', '/users/:id', (ctx) => {
  requireAdmin(ctx)
  const user = userOf(ctx.params.id)
  if (user.id === ctx.user.id) {
    throw new HttpError(
      400,
      'validation_error',
      'Нельзя удалить собственную учётную запись',
    )
  }
  user.deletedAt = nowIso()
})

/* --- файлы --- */

route('POST', '/files', async (ctx) => {
  requireRole(ctx, 'admin', 'advertiser')
  const kind = ctx.form?.get('kind')
  const file = ctx.form?.get('file')
  const rule = FILE_RULES[kind]
  const fields = {}
  if (!rule) fields.kind = 'Неизвестное назначение файла.'
  if (!(file instanceof File)) fields.file = 'Файл не был отправлен.'
  finish(fields)
  if (!file.size) throw invalid({ file: 'Отправленный файл пуст.' })
  if (!rule.accept(file.type || '', extOf(file.name))) {
    throw invalid({ file: rule.message })
  }
  return created(serializeStoredFile(await storeUpload(file, kind)))
})

/* -------------------------------- транспорт ------------------------------ */

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })

function created(body) {
  return json(201, body)
}

function toResponse(result) {
  if (result instanceof Response) return result
  if (result === undefined) return new Response(null, { status: 204 })
  return json(200, result)
}

/**
 * Замена fetch для транспорта: разбирает адрес, находит маршрут, проверяет
 * токен и возвращает настоящий Response — как будто ответил сервер.
 */
export async function mockFetch(input, init = {}) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))

  const url = new URL(String(input), window.location.origin)
  const method = (init.method ?? 'GET').toUpperCase()
  const path = url.pathname.slice(url.pathname.indexOf(PREFIX) + PREFIX.length)

  try {
    const found = routes
      .filter((r) => r.method === method)
      .map((r) => ({ r, m: r.re.exec(path) }))
      .find(({ m }) => m)
    if (!found) throw notFound('Маршрут не найден')

    const params = Object.fromEntries(
      found.r.keys.map((key, i) => [key, decodeURIComponent(found.m[i + 1])]),
    )
    const ctx = { params, query: url.searchParams, user: null }

    if (found.r.auth) {
      const header = init.headers?.Authorization ?? ''
      ctx.user = userFromToken(header.replace(/^Bearer\s+/i, ''), 'acc')
      if (!ctx.user) throw unauthorized()
    }
    if (init.body instanceof FormData) ctx.form = init.body
    else if (init.body) ctx.body = JSON.parse(init.body)

    const response = toResponse(await found.r.handler(ctx))
    if (method !== 'GET') save()
    return response
  } catch (error) {
    if (error instanceof HttpError) {
      return json(error.status, {
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
        },
      })
    }
    console.error('[mock]', error)
    return json(500, {
      error: {
        code: 'server_error',
        message: 'Внутренняя ошибка',
        fields: {},
      },
    })
  }
}

// «Сегодня» демо-данных — для подсказки в консоли разработчика.
if (import.meta.env.DEV) {
  console.info(
    `[mock] Демо-данные на ${TODAY}. Входы: admin/admin, viewer/viewer, adv/adv, click/click.`,
  )
}
