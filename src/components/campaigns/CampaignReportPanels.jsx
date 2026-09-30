import { useState } from 'react'
import {
  Check,
  Clapperboard,
  Instagram,
  MapPin,
  MonitorSmartphone,
  Pencil,
  PlayCircle,
  Plus,
  RadioTower,
  Save,
  Send,
  Timer,
  Trash2,
  Tv,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useToast } from '@/components/ui/Toast.jsx'
import { formatNumber, formatPct } from '@/lib/format.js'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card.jsx'
import { DonutChart } from '@/components/charts/DonutChart.jsx'
import { cn } from '@/lib/cn.js'

// Правки сводных отчётов лежат рядом с таблицами, каждый под своим ключом.
const STATS_STORAGE_KEY = 'globalexpo.campaign.report-stats.v1'

/** Число из поля: там строка, иногда с пробелами. */
const statNumber = (value) => {
  const digits = String(value ?? '').replace(/[^\d.-]/g, '')
  const number = Number(digits)
  return Number.isFinite(number) ? number : 0
}

/** Как в отчёте: 14 111 352. Тем же видом показываем и в поле правки. */
const groupDigits = (value) => {
  const raw = String(value ?? '')
  if (!raw.trim()) return ''
  // Дроби в показателях не используются, поэтому оставляем только цифры.
  const digits = raw.replace(/[^\d]/g, '')
  return digits ? formatNumber(Number(digits)) : ''
}

function loadStats(key, seed) {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY) || '{}')
    // Сохранённый отчёт мог быть записан до появления новых блоков —
    // недостающее добираем из сида, иначе панель падает на пустом поле.
    return saved[key] ? { ...seed, ...saved[key] } : seed
  } catch {
    return seed
  }
}

function persistStats(key, data) {
  try {
    const saved = JSON.parse(localStorage.getItem(STATS_STORAGE_KEY) || '{}')
    localStorage.setItem(
      STATS_STORAGE_KEY,
      JSON.stringify({ ...saved, [key]: data }),
    )
  } catch {
    // Переполнилось хранилище — правки останутся до перезагрузки.
  }
}

/** Правка сводного отчёта: состояние, режим и сохранение в одном месте. */
function useEditableStats(key, seed, title) {
  const { isAdvertiser, canEdit } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(() => loadStats(key, seed))
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = () => {
    persistStats(key, data)
    setEditing(false)
    setSaved(true)
    toast.success(`${title}: отчёт сохранён`)
    setTimeout(() => setSaved(false), 1200)
  }

  const cancel = () => {
    setData(loadStats(key, seed))
    setEditing(false)
  }

  return {
    data,
    setData,
    editing,
    setEditing,
    saved,
    save,
    cancel,
    // Рекламодателю и наблюдателю сводки доступны только на просмотр.
    readOnly: isAdvertiser || !canEdit,
  }
}

/** Кнопки «Редактировать» / «Сохранить» в шапке сводного отчёта. */
function EditControls({ state, className }) {
  if (state.readOnly) return null
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {state.editing ? (
        <>
          <Button size="sm" variant="secondary" onClick={state.cancel}>
            Отмена
          </Button>
          <Button size="sm" onClick={state.save}>
            <Save size={15} />
            Сохранить
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => state.setEditing(true)}
        >
          {state.saved ? <Check size={15} /> : <Pencil size={15} />}
          {state.saved ? 'Сохранено' : 'Редактировать'}
        </Button>
      )}
    </div>
  )
}

/** Поле числа в сводке: в режиме правки — input, иначе просто значение. */
function StatValue({ editing, value, onChange, className, suffix }) {
  if (!editing) {
    return (
      <p className={cn('font-display font-semibold text-ink tnum', className)}>
        {formatNumber(statNumber(value))}
        {suffix}
      </p>
    )
  }
  return (
    <input
      value={groupDigits(value)}
      onChange={(e) => onChange(groupDigits(e.target.value))}
      inputMode="numeric"
      className={cn(
        'w-full rounded-lg border border-line bg-surface px-2 py-1 font-display font-semibold text-ink outline-hidden transition-colors tnum focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200',
        className,
      )}
    />
  )
}

const CHANNELS = [
  {
    name: 'Канал 1',
    code: 'K1',
    standardSpots: 329,
    standardSeconds: 9870,
    liveAds: 272,
    liveSeconds: 8160,
    liveViews: 14111352,
  },
  {
    name: 'Канал 2',
    code: 'K2',
    standardSpots: 315,
    standardSeconds: 9450,
    liveAds: 172,
    liveSeconds: 5160,
    liveViews: 9596809,
  },
]

const SOCIAL_CHANNELS = [
  {
    name: 'Instagram',
    icon: Instagram,
    color: '#8B5CF6',
    posts: 6,
    impressions: 176157,
    linkPrefix: 'instagram.com/',
    rows: [51102, 30399, 29222, 27392, 23915, 14127],
  },
  {
    name: 'Telegram',
    icon: Send,
    color: '#29B6F6',
    posts: 6,
    impressions: 264400,
    linkPrefix: 't.me/',
    rows: [35000, 39200, 42600, 58800, 46200, 42600],
  },
]

const TOTAL_METRICS = [
  { label: 'Прямые эфиры', value: 111, icon: RadioTower },
  { label: 'Рекламные ролики', value: 1088, icon: Clapperboard },
  { label: 'Промо в эфире', value: 1295, icon: Tv },
  { label: 'Хронометраж, сек.', value: 32640, icon: Timer },
  { label: 'Просмотры Live Ads', value: 23708161, icon: PlayCircle },
]

const DEVICE_SHARE = [
  { label: 'Браузер', value: 3, color: '#A7B1AB' },
  { label: 'Smart TV', value: 66, color: '#0E7745' },
  { label: 'Телефон', value: 30, color: '#2A78D6' },
  { label: 'Планшет', value: 1, color: '#D9A21B' },
]

const CITY_SHARE = [
  ['Ташкент', 62.3],
  ['Самарканд', 12.6],
  ['Бухара', 7.3],
  ['Андижан', 6.4],
  ['Фергана', 5.9],
  ['Наманган', 5.5],
].map(([name, value]) => ({ name, value }))

function ReportHeader({ eyebrow, title, subtitle }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-800">
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
        {title}
      </h3>
      <p className="mt-1 max-w-2xl text-sm text-ink-muted">{subtitle}</p>
    </div>
  )
}

function ChannelMetric({
  label,
  value,
  unit,
  accent = 'coral',
  editing,
  onChange,
}) {
  const accentClass =
    accent === 'green'
      ? 'border-success/20 bg-success/[0.04]'
      : 'border-indigo-200 bg-indigo-50/40'

  return (
    <div className={`rounded-2xl border p-4 shadow-soft ${accentClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <StatValue
        editing={editing}
        value={value}
        onChange={onChange}
        className="mt-2 text-2xl"
      />
      {unit && <p className="mt-0.5 text-[12px] text-ink-muted">{unit}</p>}
    </div>
  )
}

function ChannelPanel({ channel, editing, onChange }) {
  // Наблюдателю просмотры не показываем — как и в таблице размещений.
  const { isViewer } = useAuth()
  const set = (key) => (value) => onChange({ ...channel, [key]: value })

  return (
    <div className="rounded-3xl border border-line bg-surface/90 p-4 shadow-soft sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center bg-forest font-mono text-xs font-bold text-lime-300">
          {channel.code}
        </span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <input
              value={channel.name}
              onChange={(e) => set('name')(e.target.value)}
              aria-label="Название канала"
              className="w-full rounded-lg border border-line bg-surface px-2 py-1 font-display text-lg font-semibold text-ink outline-hidden transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
          ) : (
            <h4 className="font-display text-lg font-semibold text-ink">
              {channel.name}
            </h4>
          )}
          <p className="text-[12px] text-ink-muted">TV media performance</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <ChannelMetric
          label="Standard spot"
          value={channel.standardSpots}
          unit="роликов"
          editing={editing}
          onChange={set('standardSpots')}
        />
        <ChannelMetric
          label="Live spot UFC / Football"
          value={channel.liveAds}
          unit="Live Ads"
          editing={editing}
          onChange={set('liveAds')}
        />
        <ChannelMetric
          label="Standard spot"
          value={channel.standardSeconds}
          unit="секунд"
          editing={editing}
          onChange={set('standardSeconds')}
        />
        <ChannelMetric
          label="Live spot UFC / Football"
          value={channel.liveSeconds}
          unit="секунд"
          editing={editing}
          onChange={set('liveSeconds')}
        />
        {!isViewer && (
          <div className="col-span-2">
            <ChannelMetric
              label="TV Live Ads Views"
              value={channel.liveViews}
              unit="просмотров"
              editing={editing}
              onChange={set('liveViews')}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const SPOT_SEED = {
  channels: CHANNELS.map((channel) => ({ ...channel })),
  eventPromo: 1295,
  ottPreroll: 884310,
}

export function ChannelSummaryReport() {
  const state = useEditableStats('spot', SPOT_SEED, 'Spot statistic')
  const { data, setData, editing } = state

  const setChannel = (index) => (channel) =>
    setData({
      ...data,
      channels: data.channels.map((item, i) => (i === index ? channel : item)),
    })

  return (
    <section className="relative overflow-hidden rounded-3xl border border-line border-t-4 border-t-indigo-500 bg-surface p-5 sm:p-6">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-grid-fade bg-size-[22px_22px] mask-[linear-gradient(to_left,black,transparent)]" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <ReportHeader
          eyebrow="Channel report"
          title="Spot statistic"
          subtitle="Сводные показатели стандартных и live-размещений по двум телеканалам."
        />
        <EditControls state={state} />
      </div>

      <div className="relative mt-6 grid gap-4 xl:grid-cols-2">
        {data.channels.map((channel, index) => (
          <ChannelPanel
            key={channel.code}
            channel={channel}
            editing={editing}
            onChange={setChannel(index)}
          />
        ))}
      </div>

      <div className="relative mt-4 grid gap-4 sm:grid-cols-2">
        <ChannelMetric
          label="TV Event Promo Count"
          value={data.eventPromo}
          unit="промо в эфире"
          accent="green"
          editing={editing}
          onChange={(value) => setData({ ...data, eventPromo: value })}
        />
        <ChannelMetric
          label="OTT Pre-roll Views"
          value={data.ottPreroll}
          unit="просмотров"
          accent="green"
          editing={editing}
          onChange={(value) => setData({ ...data, ottPreroll: value })}
        />
      </div>
    </section>
  )
}

function TotalMetric({ item, editing, onChange }) {
  const Icon = TOTAL_ICONS[item.label] ?? RadioTower
  return (
    <div className="rounded-2xl border border-line bg-surface/85 p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-muted">
          {item.label}
        </p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900">
          <Icon size={16} />
        </span>
      </div>
      <StatValue
        editing={editing}
        value={item.value}
        onChange={onChange}
        className="mt-3 text-2xl"
      />
    </div>
  )
}

// Иконки метрик держим отдельно: в хранилище едут только числа.
const TOTAL_ICONS = Object.fromEntries(
  TOTAL_METRICS.map((item) => [item.label, item.icon]),
)

const TOTAL_SEED = {
  metrics: TOTAL_METRICS.map(({ label, value }) => ({ label, value })),
  social: SOCIAL_CHANNELS.map(({ name, posts, impressions }) => ({
    name,
    posts,
    impressions,
  })),
  devices: DEVICE_SHARE.map((item) => ({ ...item })),
  cities: CITY_SHARE.map((item) => ({ ...item })),
}

// Иконка и цвет соцсети живут в коде — в хранилище едут только цифры.
const SOCIAL_STYLE = Object.fromEntries(
  SOCIAL_CHANNELS.map((channel) => [
    channel.name,
    { icon: channel.icon, color: channel.color },
  ]),
)

export function TotalStatisticsReport() {
  // Наблюдателю не показываем просмотры, устройства и географию —
  // остаётся эфирная сводка и социальные сети.
  const { isViewer } = useAuth()
  const state = useEditableStats('total', TOTAL_SEED, 'Total statistics')
  const { data, setData, editing } = state
  const metrics = isViewer
    ? data.metrics.filter((item) => item.label !== 'Просмотры Live Ads')
    : data.metrics

  const setMetric = (label) => (value) =>
    setData({
      ...data,
      metrics: data.metrics.map((item) =>
        item.label === label ? { ...item, value } : item,
      ),
    })

  const setDevice = (index, patch) =>
    setData({
      ...data,
      devices: data.devices.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    })

  const setCity = (index, patch) =>
    setData({
      ...data,
      cities: data.cities.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    })

  const addCity = () =>
    setData({ ...data, cities: [...data.cities, { name: '', value: 0 }] })

  const setSocial = (index, patch) =>
    setData({
      ...data,
      social: data.social.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    })

  const removeCity = (index) =>
    setData({ ...data, cities: data.cities.filter((_, i) => i !== index) })

  const devices = data.devices.map((item) => ({
    ...item,
    value: statNumber(item.value),
  }))
  const topDevice = devices.reduce(
    (top, item) => (!top || item.value > top.value ? item : top),
    null,
  )

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl border border-line border-t-4 border-t-indigo-500 bg-surface p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-grid-fade bg-size-[22px_22px] mask-[linear-gradient(to_left,black,transparent)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <ReportHeader
            eyebrow="Total statistics"
            title="Общая статистика размещений"
            subtitle={
              isViewer
                ? 'Сводка эфира и социальных сетей.'
                : 'Сводка эфира, социальных сетей, устройств и географии аудитории.'
            }
          />
          <EditControls state={state} />
        </div>
        <div
          className={cn(
            'relative mt-6 grid grid-cols-2 gap-3',
            isViewer ? 'lg:grid-cols-4' : 'lg:grid-cols-5',
          )}
        >
          {metrics.map((item) => (
            <TotalMetric
              key={item.label}
              item={item}
              editing={editing}
              onChange={setMetric(item.label)}
            />
          ))}
        </div>
      </section>

      <div
        className={cn(
          'mt-4 grid gap-4',
          !isViewer && 'xl:grid-cols-[0.72fr_0.95fr_1.1fr]',
        )}
      >
        <Card className="p-5">
          <h4 className="font-display text-base font-semibold text-ink">
            Социальные сети
          </h4>
          <p className="text-[12px] text-ink-muted">Instagram и Telegram</p>
          {/* У наблюдателя карточка одна на всю ширину — раскладываем каналы
              в две колонки, чтобы не тянуть их в высоту. */}
          <div
            className={cn(
              'mt-4',
              isViewer ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3',
            )}
          >
            {data.social.map((channel, index) => {
              const style = SOCIAL_STYLE[channel.name] ?? {}
              const Icon = style.icon ?? Send
              return (
                <div
                  key={channel.name}
                  className="rounded-2xl border border-line bg-paper/40 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: style.color ?? '#8A958F' }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="font-display text-sm font-semibold text-ink">
                      {channel.name}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                        Posts
                      </p>
                      <StatValue
                        editing={editing}
                        value={channel.posts}
                        onChange={(posts) => setSocial(index, { posts })}
                        className="mt-1 text-lg"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-ink-muted">
                        Impressions
                      </p>
                      <StatValue
                        editing={editing}
                        value={channel.impressions}
                        onChange={(impressions) =>
                          setSocial(index, { impressions })
                        }
                        className="mt-1 text-lg"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {!isViewer && (
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-display text-base font-semibold text-ink">
                  Распределение устройств
                </h4>
                <p className="text-[12px] text-ink-muted">Device share</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                <MonitorSmartphone size={18} />
              </span>
            </div>
            <div className="mt-5 flex flex-col items-center gap-5">
              <DonutChart
                data={devices}
                size={190}
                thickness={22}
                centerValue={formatPct(topDevice?.value ?? 0, 0)}
                centerLabel={topDevice?.label ?? ''}
              />
              <div className="w-full space-y-2">
                {data.devices.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    />
                    {editing ? (
                      <>
                        <input
                          value={item.label}
                          onChange={(e) =>
                            setDevice(index, { label: e.target.value })
                          }
                          aria-label="Устройство"
                          className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-hidden transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                        />
                        <input
                          value={item.value}
                          onChange={(e) =>
                            setDevice(index, {
                              value: statNumber(e.target.value),
                            })
                          }
                          inputMode="numeric"
                          aria-label="Доля, %"
                          className="h-8 w-16 rounded-lg border border-line bg-surface px-2 text-right text-[13px] text-ink outline-hidden transition-colors tnum focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                        />
                      </>
                    ) : (
                      <>
                        <span className="text-ink-soft">{item.label}</span>
                        <span className="ml-auto font-semibold text-ink tnum">
                          {formatPct(statNumber(item.value), 0)}
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {!isViewer && (
          <Card className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 border-b border-line p-5 pb-4">
              <div>
                <h4 className="font-display text-base font-semibold text-ink">
                  География аудитории
                </h4>
                <p className="text-[12px] text-ink-muted">City viewers</p>
              </div>
              {editing ? (
                <Button size="sm" variant="secondary" onClick={addCity}>
                  <Plus size={15} />
                  Город
                </Button>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                  <MapPin size={18} />
                </span>
              )}
            </div>
            <div className="max-h-[470px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm">
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    <th className="w-10 py-2.5 pl-5 text-left">№</th>
                    <th className="py-2.5 pl-2.5 pr-5 text-left">Город</th>
                    <th className="px-5 py-2.5 text-right">Зрители</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.cities.map((city, index) => (
                    <tr
                      key={`${city.name}-${index}`}
                      className="hover:bg-ink/1.5"
                    >
                      <td className="py-2.5 pl-5 text-[12px] text-ink-muted tnum">
                        {index + 1}
                      </td>
                      <td className="py-2.5 pl-2.5 pr-5 font-medium text-ink-soft">
                        {editing ? (
                          <input
                            value={city.name}
                            onChange={(e) =>
                              setCity(index, { name: e.target.value })
                            }
                            aria-label="Город"
                            className="h-8 w-full rounded-lg border border-line bg-surface px-2 text-[13px] text-ink outline-hidden transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                          />
                        ) : (
                          city.name
                        )}
                      </td>
                      <td className="relative px-5 py-2.5 text-right">
                        {editing ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              value={city.value}
                              onChange={(e) =>
                                setCity(index, {
                                  value: statNumber(e.target.value),
                                })
                              }
                              inputMode="decimal"
                              aria-label="Доля зрителей, %"
                              className="h-8 w-20 rounded-lg border border-line bg-surface px-2 text-right text-[13px] text-ink outline-hidden transition-colors tnum focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                            />
                            <button
                              type="button"
                              onClick={() => removeCity(index)}
                              aria-label={`Удалить ${city.name || 'город'}`}
                              title="Удалить"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-danger transition hover:bg-danger hover:text-white focus-ring"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className="absolute inset-y-1.5 right-3 rounded-md bg-indigo-100"
                              style={{
                                width: `${Math.max(statNumber(city.value), 4)}%`,
                              }}
                            />
                            <span className="relative font-semibold text-ink tnum">
                              {formatPct(statNumber(city.value), 2)}
                            </span>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// Выгрузка всей статистики берёт те же данные, что показывают панели:
// сохранённые правки, а если их нет — сид.
