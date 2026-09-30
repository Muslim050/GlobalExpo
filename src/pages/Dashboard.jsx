import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarClock,
  FileText,
  Megaphone,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import { contractTitle } from '@/features/contracts/title'
import { advertiserLogo } from '@/features/advertisers/logo'
import { useScopedCampaigns } from '@/lib/useScope.js'
import { STATUS } from '@/lib/metrics.js'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatPct,
  paidAtOf,
} from '@/lib/format.js'
import { MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import { PageHeader } from '@/components/PageHeader.jsx'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card.jsx'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Progress } from '@/components/ui/Progress.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { FadeIn } from '@/components/ui/FadeIn.jsx'
import { BarChart } from '@/components/charts/BarChart.jsx'
import { cn } from '@/lib/cn.js'

/** Суммы приходят decimal-строками — в расчётах они нужны числами. */
const toNumber = (value) => Number(value) || 0

/** Путь заявки по статусам — в том порядке, в каком кампания их проходит. */
const PIPELINE = [
  'sent',
  'received',
  'reviewing',
  'active',
  'awaiting_payment',
  'paid',
  'completed',
]

/** Сколько месяцев показывает график поступлений. */
const MONTHS_BACK = 6

/** Последние N месяцев, включая текущий: [{ period, label }], старые слева. */
function lastMonths(count) {
  const now = new Date()
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i))
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { period, label: MONTHS_FULL[date.getMonth()].slice(0, 3) }
  })
}

/** Всё, что показывает обзор, — одним проходом по брендам и кампаниям. */
function summarize(advertisers, campaigns) {
  const contracts = advertisers.flatMap((advertiser) =>
    (advertiser.contracts ?? []).map((contract) => ({ contract, advertiser })),
  )

  const budget = contracts.reduce(
    (s, { contract }) => s + toNumber(contract.budget),
    0,
  )
  const paid = contracts.reduce(
    (s, { contract }) => s + toNumber(contract.spent),
    0,
  )

  const payments = contracts
    .flatMap(({ contract, advertiser }) =>
      (contract.payments ?? []).map((payment) => ({
        ...payment,
        at: paidAtOf(payment),
        contract,
        advertiser,
      })),
    )
    .sort((a, b) => (a.at < b.at ? 1 : -1))

  const byMonth = lastMonths(MONTHS_BACK).map(({ period, label }) => ({
    label,
    value: payments
      .filter((p) => p.at?.slice(0, 7) === period)
      .reduce((s, p) => s + toNumber(p.amount), 0),
  }))

  const brands = advertisers
    .map((advertiser) => {
      const own = advertiser.contracts ?? []
      return {
        advertiser,
        budget: own.reduce((s, c) => s + toNumber(c.budget), 0),
        paid: own.reduce((s, c) => s + toNumber(c.spent), 0),
      }
    })
    .filter((brand) => brand.budget > 0)
    .sort((a, b) => b.budget - a.budget)

  // Ждут денег — договоры, у которых последняя отметка «ожидает оплату».
  const awaiting = contracts
    .filter(({ contract }) => contract.paymentStatus === 'awaiting')
    .map((row) => ({
      ...row,
      rest: toNumber(row.contract.budget) - toNumber(row.contract.spent),
    }))
    .sort((a, b) => b.rest - a.rest)

  const pipeline = PIPELINE.map((status) => ({
    status,
    count: campaigns.filter((c) => c.status === status).length,
  }))

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = campaigns
    .filter((c) => c.startDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  return {
    contractsCount: contracts.length,
    budget,
    paid,
    payments,
    byMonth,
    brands,
    awaiting,
    pipeline,
    upcoming,
    active: campaigns.filter((c) => c.status === 'active').length,
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data: advertisers = [], isPending: brandsPending } =
    useVisibleAdvertisers()
  const { data: campaigns = [], isPending: campaignsPending } =
    useScopedCampaigns()

  if (brandsPending || campaignsPending) {
    return <Loader label="Собираем обзор…" />
  }

  const data = summarize(advertisers, campaigns)
  const advertiserById = new Map(advertisers.map((a) => [a.id, a]))
  const firstName = user?.name?.split(' ')[0]
  const now = new Date()
  const paidShare = data.budget ? (data.paid / data.budget) * 100 : 0
  const rest = data.budget - data.paid

  return (
    <FadeIn>
      <PageHeader
        title={firstName ? `Здравствуйте, ${firstName}` : 'Обзор'}
        subtitle={`Бренды, договоры, деньги и кампании Global Expo на ${formatDate(now)}.`}
      />

      {/* Табло: деньги и работа — главные цифры одной строкой. */}
      <section className="mb-6 grid gap-px border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-forest p-5 text-white">
          <p className="eyebrow flex items-center gap-2 text-lime-300">
            <Banknote size={14} />
            Оплачено по договорам
          </p>
          <p className="mt-4 font-display text-[30px] font-bold leading-none tracking-[-0.02em] tnum">
            {formatMoneyCompact(data.paid)}
          </p>
          <Progress
            value={paidShare}
            tone="lime"
            inverted
            label={formatPct(paidShare, 0)}
            className="mt-4"
          />
        </div>
        <Tile
          icon={FileText}
          label="Бюджет договоров"
          value={formatMoneyCompact(data.budget)}
          hint={`${data.contractsCount} договоров · ${advertisers.length} брендов`}
        />
        <Tile
          icon={CalendarClock}
          label="Остаток к оплате"
          value={formatMoneyCompact(rest)}
          hint={
            data.awaiting.length
              ? `Ждут оплату: ${data.awaiting.length}`
              : 'Все месяцы оплачены'
          }
          tone={rest > 0 ? 'danger' : 'success'}
        />
        <Tile
          icon={Megaphone}
          label="Кампании в работе"
          value={data.active}
          hint={`Всего кампаний: ${campaigns.length}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Деньги во времени — один ряд, легенда не нужна: его называет
            заголовок. */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <div>
              <p className="eyebrow text-ink-muted">Деньги</p>
              <CardTitle className="mt-1.5">Поступления по месяцам</CardTitle>
            </div>
            <p className="text-right text-[12px] text-ink-muted">
              За {MONTHS_BACK} месяцев
              <span className="block font-display text-base font-bold text-ink tnum">
                {formatMoneyCompact(
                  data.byMonth.reduce((s, m) => s + m.value, 0),
                )}
              </span>
            </p>
          </CardHeader>
          <div className="h-[240px] px-5 pb-5 pt-10">
            <BarChart data={data.byMonth} formatValue={formatMoneyCompact} />
          </div>
        </Card>

        {/* Путь заявки — счётчики по статусам, как указатели залов. */}
        <Card>
          <CardHeader>
            <div>
              <p className="eyebrow text-ink-muted">Кампании</p>
              <CardTitle className="mt-1.5">Путь заявки</CardTitle>
            </div>
          </CardHeader>
          <ol className="border-t border-line">
            {data.pipeline.map(({ status, count }, index) => (
              <li
                key={status}
                className={cn(
                  'flex items-center gap-3 border-b border-line px-5 py-2.5 last:border-0',
                  !count && 'text-ink-muted',
                )}
              >
                <span className="font-mono text-[10.5px] text-ink-muted">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-[13px] font-medium">
                  {STATUS[status].label}
                </span>
                <span
                  className={cn(
                    'min-w-7 px-1.5 py-0.5 text-center font-mono text-[12px] font-bold tnum',
                    count ? 'bg-indigo-500 text-white' : 'bg-ink/[0.05]',
                  )}
                >
                  {count}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {/* Бренды: бюджет — светлая дорожка, оплачено — заливка поверх неё.
            Шкала общая, поэтому бренды сравнимы между собой. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <p className="eyebrow text-ink-muted">Бренды</p>
              <CardTitle className="mt-1.5">Бюджет и оплата</CardTitle>
            </div>
            <div className="flex items-center gap-4 text-[12px] text-ink-soft">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 bg-indigo-500" />
                Оплачено
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 bg-indigo-100" />
                Бюджет
              </span>
            </div>
          </CardHeader>
          <ul className="space-y-4 px-5 pb-5">
            {data.brands.map(({ advertiser, budget, paid }) => {
              const max = data.brands[0]?.budget || 1
              return (
                <li
                  key={advertiser.id}
                  title={`${advertiser.name}: оплачено ${formatMoney(paid)} из ${formatMoney(budget)}`}
                >
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <Avatar
                      name={advertiser.name}
                      color={advertiser.color}
                      src={advertiserLogo(advertiser)}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                      {advertiser.name}
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-muted tnum">
                      <span className="font-semibold text-ink">
                        {formatMoneyCompact(paid)}
                      </span>{' '}
                      из {formatMoneyCompact(budget)}
                    </span>
                  </div>
                  <div className="relative h-3 bg-ink/[0.04]">
                    <div
                      className="absolute inset-y-0 left-0 bg-indigo-100"
                      style={{ width: `${(budget / max) * 100}%` }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 bg-indigo-500"
                      style={{ width: `${(paid / max) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Кто должен — статус подписан словами, не только цветом. */}
        <Card>
          <CardHeader>
            <div>
              <p className="eyebrow text-ink-muted">Оплата</p>
              <CardTitle className="mt-1.5">Ждут оплату</CardTitle>
            </div>
            <Link
              to="/app/contracts"
              className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 focus-ring"
            >
              Договоры
              <ArrowRight size={13} />
            </Link>
          </CardHeader>
          {data.awaiting.length ? (
            <ul className="border-t border-line">
              {data.awaiting.map(({ contract, advertiser, rest: due }) => (
                <li
                  key={contract.id}
                  className="flex items-start gap-3 border-b border-line px-5 py-3 last:border-0"
                >
                  <Avatar
                    name={advertiser.name}
                    color={advertiser.color}
                    src={advertiserLogo(advertiser)}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {contractTitle(contract)}
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      {advertiser.name}
                      {contract.paymentStatusAt &&
                        ` · с ${formatDate(contract.paymentStatusAt)}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge tone="danger">Ожидает оплату</Badge>
                    <p className="mt-1 text-[12px] font-semibold text-ink tnum">
                      {formatMoneyCompact(due)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line px-5 py-8 text-center text-[13px] text-ink-muted">
              Все месяцы по договорам оплачены.
            </p>
          )}
        </Card>

        {/* Ближайшие старты — дата крупно, как на выставочном расписании. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <p className="eyebrow text-ink-muted">Расписание</p>
              <CardTitle className="mt-1.5">Ближайшие старты</CardTitle>
            </div>
            <Link
              to="/app/campaigns"
              className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-800 focus-ring"
            >
              Все кампании
              <ArrowRight size={13} />
            </Link>
          </CardHeader>
          {data.upcoming.length ? (
            // Нечётная последняя карточка растягивается — без пустой клетки.
            <ul className="grid gap-px border-t border-line bg-line sm:grid-cols-2 sm:[&>li:last-child:nth-child(odd)]:col-span-2">
              {data.upcoming.map((campaign) => {
                const start = new Date(campaign.startDate)
                const brand = advertiserById.get(campaign.advertiserId)
                const status = STATUS[campaign.status]
                return (
                  <li
                    key={campaign.id}
                    className="flex items-center gap-4 bg-surface px-5 py-4"
                  >
                    <div className="w-12 shrink-0 border-l-[3px] border-indigo-500 pl-2.5">
                      <p className="font-display text-xl font-bold leading-none text-ink tnum">
                        {String(start.getDate()).padStart(2, '0')}
                      </p>
                      <p className="eyebrow mt-1 text-ink-muted">
                        {MONTHS_FULL[start.getMonth()].slice(0, 3)}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-ink">
                        {campaign.name}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-muted">
                        {brand?.name ?? 'Бренд не указан'} · до{' '}
                        {formatDate(campaign.endDate)}
                      </p>
                    </div>
                    {status && (
                      <Badge tone={status.tone} dot className="shrink-0">
                        {status.label}
                      </Badge>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="border-t border-line px-5 py-8 text-center text-[13px] text-ink-muted">
              Новых стартов не запланировано.
            </p>
          )}
        </Card>

        {/* Последние поступления — лента денег. */}
        <Card>
          <CardHeader>
            <div>
              <p className="eyebrow text-ink-muted">Деньги</p>
              <CardTitle className="mt-1.5">Последние поступления</CardTitle>
            </div>
          </CardHeader>
          {data.payments.length ? (
            <ul className="border-t border-line">
              {data.payments.slice(0, 5).map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center gap-3 border-b border-line px-5 py-3 last:border-0"
                >
                  <Building2 size={15} className="shrink-0 text-ink-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {payment.advertiser.name}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-muted tnum">
                      {formatDateTime(payment.at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[13px] font-bold text-success tnum">
                    + {formatMoneyCompact(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line px-5 py-8 text-center text-[13px] text-ink-muted">
              Поступлений пока не было.
            </p>
          )}
        </Card>
      </div>
    </FadeIn>
  )
}

/** Клетка табло: подпись капсом, крупная цифра, пояснение мелко. */
function Tile({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="bg-surface p-5">
      <p className="eyebrow flex items-center gap-2 text-ink-muted">
        <Icon size={14} />
        {label}
      </p>
      <p
        className={cn(
          'mt-4 font-display text-[30px] font-bold leading-none tracking-[-0.02em] tnum',
          tone === 'danger'
            ? 'text-danger'
            : tone === 'success'
              ? 'text-success'
              : 'text-ink',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-3 text-[12px] text-ink-muted">{hint}</p>}
    </div>
  )
}
