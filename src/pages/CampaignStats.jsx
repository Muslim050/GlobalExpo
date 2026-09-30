import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { campaignStatsRoute } from '@/router'
import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Eye,
  MousePointerClick,
  Radio,
  Target,
  TrendingUp,
  WalletCards,
} from 'lucide-react'
// Площадки ещё на моке — из него берём только их:
import { useData } from '@/context/DataContext.jsx'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import { useScopedCampaigns } from '@/lib/useScope.js'
import { STATUS, cpa, cpm, ctr, cvr, statusLabel } from '@/lib/metrics.js'
import { seededSeries } from '@/lib/id.js'
import {
  formatCompact,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatPct,
  lastNDates,
} from '@/lib/format.js'
import { PageHeader } from '@/components/PageHeader.jsx'
import { Logo } from '@/components/Logo'
import { AreaChart } from '@/components/charts/AreaChart.jsx'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { Progress } from '@/components/ui/Progress.jsx'
import { SegmentTabs } from '@/components/ui/Tabs.jsx'
import { MediaReport } from '@/components/campaigns/MediaReport.jsx'
import { MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import { useReportMonths } from '@/features/reports/queries'
import { advertiserLogo } from '@/features/advertisers/logo'

const METRICS = {
  spent: { label: 'Расход', color: '#0E7745', format: formatMoneyCompact },
  impressions: { label: 'Показы', color: '#0EA5E9', format: formatCompact },
  clicks: { label: 'Клики', color: '#D9A21B', format: formatCompact },
}

function MetricCard({ icon: Icon, label, value, hint }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-muted">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900">
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold text-ink tnum">
        {value}
      </p>
      <p className="mt-1 text-[12px] text-ink-muted">{hint}</p>
    </Card>
  )
}

/** Текущий месяц: `2026-09`. */
function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Месяцы периода кампании — до текущего включительно: отчёт за месяц,
 * который ещё не наступил, загрузить нельзя.
 */
function periodsOf(startDate, endDate) {
  if (!startDate) return []
  const now = currentPeriod()
  const end = (endDate || startDate).slice(0, 7)
  const stop = end < now ? end : now
  const periods = []
  let [year, month] = startDate.slice(0, 7).split('-').map(Number)
  // Страховка от кривых дат: кампаний длиннее пяти лет не бывает.
  while (periods.length < 60) {
    const period = `${year}-${String(month).padStart(2, '0')}`
    if (period > stop) break
    periods.push(period)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return periods
}

/** `2026-01` → «Январь 2026». */
const periodTitle = (period) => {
  const [year, month] = period.split('-')
  return `${MONTHS_FULL[Number(month) - 1]} ${year}`
}

/**
 * Отчёт на карточке кампании. Отчёт ведётся по договору и месяцу, а у
 * кампании месяцев бывает несколько, — поэтому над ним переключатель по
 * месяцам её периода. Открываем последний, за который файл уже загружен.
 */
function CampaignReport({ campaign, contract }) {
  const periods = periodsOf(campaign.startDate, campaign.endDate)
  const { data: months } = useReportMonths(contract?.id)
  const loaded = new Set((months ?? []).map((item) => item.period))
  const fallback =
    [...periods].reverse().find((period) => loaded.has(period)) ??
    periods[periods.length - 1]
  const [picked, setPicked] = useState(null)
  const period = periods.includes(picked) ? picked : fallback

  if (!period) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-surface px-4 py-3 text-[13px] text-ink-muted">
        Период кампании ещё не начался — отчёт появится с первым месяцем.
      </p>
    )
  }

  return (
    <>
      {periods.length > 1 && (
        <SegmentTabs
          className="mb-4"
          value={period}
          onChange={setPicked}
          items={periods.map((item) => ({
            value: item,
            label: periodTitle(item),
            statusHint: loaded.has(item)
              ? 'файл статистики загружен'
              : 'файл статистики не загружен',
          }))}
        />
      )}
      <MediaReport
        key={`${contract?.id ?? 'none'}-${period}`}
        contractId={contract?.id}
        period={period}
        emptyHint="У кампании не указан договор — отчёт из файла статистики ведётся по договору."
      />
    </>
  )
}

export default function CampaignStats() {
  const { campaignId } = campaignStatsRoute.useParams()
  const navigate = useNavigate()
  const { data: campaigns = [], isPending } = useScopedCampaigns()
  const { data: advertisers = [] } = useVisibleAdvertisers()
  const { channelById } = useData()
  const [metric, setMetric] = useState('spent')

  // Идентификаторы на сервере числовые, а из адреса приходит строка.
  const campaign = campaigns.find((item) => item.id === Number(campaignId))

  // Кампании с таким id нет — возвращаемся к списку. Пока список грузится,
  // никуда не уходим: иначе экран отскакивал бы назад на каждом открытии.
  useEffect(() => {
    if (!isPending && !campaign)
      navigate({ to: '/app/campaigns', replace: true })
  }, [campaign, isPending, navigate])

  // Пока список кампаний не пришёл, показываем ожидание: без него экран
  // оставался пустым, а потом резко наполнялся.
  if (isPending) return <Loader label="Загружаем статистику…" />
  if (!campaign) return null

  const advertiser = advertisers.find((a) => a.id === campaign.advertiserId)
  // Деньги переехали на договор — берём их оттуда, а не из кампании.
  const contract = (advertiser?.contracts ?? []).find(
    (c) => c.number === campaign.contractNumber,
  )
  const budget = Number(contract?.budget) || 0
  const spent = Number(contract?.spent) || 0
  // Медиаплан и отчётные вкладки доступны у всех запущенных кампаний.
  const hasMediaTables = campaign.status === 'active'
  const channels = campaign.channelIds.flatMap((id) => {
    const channel = channelById(id)
    return channel ? [channel] : []
  })
  const status = STATUS[campaign.status]
  const budgetPacing = budget ? (spent / budget) * 100 : 0
  const remaining = Math.max(0, budget - spent)
  const metricConfig = METRICS[metric]
  const period = 14
  const series = seededSeries(
    `campaign-${campaign.id}-${metric}`,
    period,
    Math.max(
      (metric === 'spent' ? spent : campaign[metric]) / period,
      metric === 'clicks' ? 10 : 100,
    ),
    0.28,
  )

  return (
    <div>
      <PageHeader
        title="Статистика кампании"
        subtitle="Подробные показатели, динамика и распределение бюджета."
      >
        <Button
          variant="secondary"
          onClick={() => navigate({ to: '/app/campaigns' })}
        >
          <ArrowLeft size={17} />
          Назад
        </Button>
      </PageHeader>

      <section className="relative mb-4 overflow-hidden rounded-3xl border border-line border-t-4 border-t-indigo-500 bg-surface p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-grid-fade bg-size-[22px_22px] mask-[linear-gradient(to_left,black,transparent)]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {advertiser && (
              <Avatar
                name={advertiser.name}
                color={advertiser.color}
                src={advertiserLogo(advertiser)}
                size="lg"
              />
            )}
            <div className="min-w-0">
              <h2 className="truncate font-display text-xl font-semibold sm:text-2xl">
                {campaign.name}
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {advertiser?.name || 'Рекламодатель не указан'}
              </p>
            </div>
          </div>
          <Badge tone={status.tone} dot className="w-fit shadow-soft">
            {statusLabel(campaign.status)}
          </Badge>
        </div>
      </section>

      {hasMediaTables ? (
        <CampaignReport campaign={campaign} contract={contract} />
      ) : (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-line border-t-4 border-t-indigo-500 bg-surface p-5 sm:p-6">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-grid-fade bg-size-[22px_22px] mask-[linear-gradient(to_left,black,transparent)]" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-800">
                Total statistics
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-ink sm:text-3xl">
                Общая статистика кампании
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                Ключевые показатели кампании «{campaign.name}» за выбранный
                период.
              </p>
            </div>

            <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
              <MetricCard
                icon={WalletCards}
                label="Бюджет"
                value={formatMoneyCompact(budget)}
                hint={`Освоено ${formatPct(budgetPacing, 0)}`}
              />
              <MetricCard
                icon={CircleDollarSign}
                value={formatMoneyCompact(spent)}
                hint={`Осталось ${formatMoneyCompact(remaining)}`}
              />
              <MetricCard
                icon={Eye}
                label="Показы"
                value={formatCompact(campaign.impressions)}
                hint={`CPM ${formatMoney(cpm(campaign))}`}
              />
              <MetricCard
                icon={MousePointerClick}
                value={formatCompact(campaign.clicks)}
                hint={`CTR ${formatPct(ctr(campaign))}`}
              />
              <MetricCard
                icon={Target}
                value={formatCompact(campaign.conversions)}
                hint={`CVR ${formatPct(cvr(campaign))}`}
              />
            </div>
          </section>

          <Card className="mt-4">
            <div className="flex flex-col gap-3 p-5 pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-ink">
                  Динамика за 14 дней
                </h3>
                <p className="text-[13px] text-ink-muted">
                  Наведите на график для точных значений
                </p>
              </div>
              <SegmentTabs
                value={metric}
                onChange={setMetric}
                items={Object.entries(METRICS).map(([value, item]) => ({
                  value,
                  label: item.label,
                }))}
              />
            </div>
            <div className="p-3 sm:p-5">
              <AreaChart
                data={series}
                labels={lastNDates(period)}
                color={metricConfig.color}
                height={280}
                formatValue={metricConfig.format}
              />
            </div>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium text-ink-muted">
                    Освоение бюджета
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold text-ink tnum">
                    {formatPct(budgetPacing, 0)}
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-900">
                  <TrendingUp size={21} />
                </span>
              </div>
              <Progress value={budgetPacing} className="mt-5 h-2" />
              <div className="mt-3 flex justify-between text-[12px] text-ink-muted">
                <span>Потрачено {formatMoneyCompact(spent)}</span>
                <span>Бюджет {formatMoneyCompact(budget)}</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
                <div>
                  <p className="text-[12px] text-ink-muted">CPA</p>
                  <p className="mt-1 font-semibold text-ink tnum">
                    {campaign.conversions ? formatMoney(cpa(campaign)) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[12px] text-ink-muted">
                    Средняя цена клика
                  </p>
                  <p className="mt-1 font-semibold text-ink tnum">
                    {campaign.clicks
                      ? formatMoney(spent / campaign.clicks)
                      : '—'}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 text-ink">
                <CalendarDays size={18} className="text-indigo-800" />
                <h3 className="font-display text-sm font-semibold">Период</h3>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">Начало</span>
                <span className="font-medium text-ink">
                  {formatDate(campaign.startDate)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="text-ink-muted">Завершение</span>
                <span className="font-medium text-ink">
                  {formatDate(campaign.endDate)}
                </span>
              </div>

              <div className="mt-5 flex items-center gap-2 border-t border-line pt-4 text-ink">
                <Radio size={18} className="text-indigo-800" />
                <h3 className="font-display text-sm font-semibold">Площадки</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {channels.length > 0 ? (
                  channels.map((channel) => (
                    <span
                      key={channel.id}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-paper px-2.5 py-1.5 text-[12px] font-medium text-ink-soft"
                    >
                      <span
                        className="h-2 w-2 rounded-sm"
                        style={{ backgroundColor: channel.color }}
                      />
                      {channel.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-ink-muted">Не выбраны</span>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {hasMediaTables && (
        <div className="mt-8 flex items-center gap-3 border-t border-line pt-5">
          <Logo size={44} withWord={false} />
          <div>
            <p className="eyebrow text-ink-muted">Global Expo</p>
            <p className="text-[12px] text-ink-soft">Campaign media report</p>
          </div>
        </div>
      )}
    </div>
  )
}
