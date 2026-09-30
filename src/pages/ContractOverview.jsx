import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  FileText,
  FolderOpen,
  Pencil,
  Search,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
// Договоры переехали на сервер. Мок остаётся для разделов, которые ещё
// не подключены: import { useData } from '@/context/DataContext.jsx'
import {
  useContracts,
  useDeletePayment,
  useSaveContractAmounts,
  useSetPaymentStatus,
  useUpdateContract,
  useUpdatePayment,
} from '@/features/contracts/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import {
  CONTRACT_PAYMENT,
  CONTRACT_STATUS,
  PAYMENT_OPTIONS,
  paymentTone,
} from '@/lib/metrics.js'
import {
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatPct,
} from '@/lib/format.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { PageHeader } from '@/components/PageHeader.jsx'
import { FadeIn } from '@/components/ui/FadeIn.jsx'
import { Progress } from '@/components/ui/Progress.jsx'
import { ContractPreviewModal } from '@/components/campaigns/ContractPreviewModal.jsx'
import { MoneyPopover } from '@/components/campaigns/MoneyPopover.jsx'
import { MonthTabs, MONTHS_FULL } from '@/components/campaigns/MonthTabs.jsx'
import {
  StatusPopover,
  periodKey,
} from '@/components/campaigns/StatusPopover.jsx'
import { cn } from '@/lib/cn.js'
import { advertiserLogo } from '@/features/advertisers/logo'
import { contractTitle } from '@/features/contracts/title'
import { useScopedCampaigns } from '@/lib/useScope.js'

const MONTHS = Array.from({ length: 12 }, (_, i) => i)

/** Месяцы периода `YYYY-MM-DD … YYYY-MM-DD` в виде ключей `YYYY-MM`. */
function monthsOf(from, to) {
  const out = []
  if (!from || !to) return out
  let [y, m] = from.slice(0, 7).split('-').map(Number)
  const [ey, em] = to.slice(0, 7).split('-').map(Number)
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/**
 * Месяцы, в которых договор «живёт»: по нему идёт кампания или стоит
 * отметка об оплате. Срока у договора на платформе нет — месяцы выводятся
 * из того, что по нему происходит.
 */
function contractPeriods(contract, campaigns) {
  const periods = new Set(Object.keys(contract.paymentStatusByPeriod ?? {}))
  for (const campaign of campaigns) {
    if (
      campaign.advertiserId !== contract.advertiserId ||
      campaign.contractNumber !== contract.number
    ) {
      continue
    }
    for (const period of monthsOf(campaign.startDate, campaign.endDate)) {
      periods.add(period)
    }
  }
  return periods
}

/** Месяц наступил? Будущие месяцы в фильтре недоступны. */
function isPassedMonth(year, month) {
  const now = new Date()
  return (
    year < now.getFullYear() ||
    (year === now.getFullYear() && month <= now.getMonth())
  )
}

/** Годы, которые задевают договоры, плюс текущий — по ним листаем месяцы. */
function yearsOf(periodsById, currentYear) {
  const years = new Set([currentYear])
  for (const periods of periodsById.values()) {
    for (const period of periods) years.add(Number(period.slice(0, 4)))
  }
  return [...years].sort((a, b) => a - b)
}

/**
 * Статус оплаты договора за месяц: за период — из истории, иначе общий.
 * Сервер отдаёт пустую строку, если статус ещё не ставили.
 */
function statusAt(contract, period) {
  if (!period) return contract.paymentStatus || null
  return contract.paymentStatusByPeriod?.[period]?.status || null
}

/** Суммы приходят decimal-строками — в расчётах они нужны числами. */
const toNumber = (value) => Number(value) || 0

export default function ContractOverview() {
  const { user, canEdit, isAdvertiser } = useAuth()
  // const { advertisers, update } = useData()
  const { rows: allRows, isPending, isError, error, refetch } = useContracts()
  const { data: campaigns = [] } = useScopedCampaigns()
  const { mutate: updateContract } = useUpdateContract()
  const { mutate: saveAmounts } = useSaveContractAmounts()
  const { mutate: savePaymentStatusFor } = useSetPaymentStatus()
  const { mutate: updatePayment } = useUpdatePayment()
  const { mutate: deletePayment } = useDeletePayment()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [year, setYear] = useState(() => new Date().getFullYear())
  // Открываемся на текущем месяце; «все месяцы» — крестик у вкладок.
  const [month, setMonth] = useState(() => new Date().getMonth())
  // Папочка открывает карточку договора, карандаш — форму правок. Держим
  // только номер строки: сам договор берём из свежей выдачи, иначе карточка
  // показывала бы состояние на момент открытия.
  const [previewId, setPreviewId] = useState(null)
  const [showPayments, setShowPayments] = useState(false)
  // Поповеры сумм и статуса оплаты: держим договор и ячейку, к которой они
  // прижаты. Сам договор берём из свежей выдачи — суммы в поповере должны
  // обновляться сразу после сохранения.
  const [moneyAnchor, setMoneyAnchor] = useState(null)
  const [paymentAnchor, setPaymentAnchor] = useState(null)

  // Рекламодатель видит только свои договоры, площадка — все.
  const rows = isAdvertiser
    ? allRows.filter(({ advertiser }) => advertiser.id === user.advertiserId)
    : allRows

  const preview = rows.find(({ contract }) => contract.id === previewId)
  const moneyRow = rows.find(({ contract }) => contract.id === moneyAnchor?.id)
  const paymentRow = rows.find(
    ({ contract }) => contract.id === paymentAnchor?.id,
  )
  // Деньги и статус оплаты ведёт площадка: рекламодателю они только видны.
  const canEditMoney = canEdit && !isAdvertiser

  // Месяцы каждого договора — по ним работают вкладки и счётчики.
  const periodsById = new Map(
    rows.map(({ contract }) => [
      contract.id,
      contractPeriods(contract, campaigns),
    ]),
  )
  const inMonth = (contract, y, m) =>
    periodsById.get(contract.id)?.has(periodKey(y, m)) ?? false

  const currentYear = new Date().getFullYear()
  const years = yearsOf(periodsById, currentYear)
  const activeYear = years.includes(year) ? year : years[years.length - 1]
  const activeMonth =
    month != null && isPassedMonth(activeYear, month) ? month : null
  const activePeriod =
    activeMonth != null ? periodKey(activeYear, activeMonth) : null

  // Счётчики на вкладках — сколько договоров действует в каждом месяце.
  const monthCounts = MONTHS.map(
    (m) =>
      rows.filter(({ contract }) => inMonth(contract, activeYear, m)).length,
  )

  // Цвет месяца: красный, если хоть один договор за него не оплачен.
  const monthStatuses = MONTHS.reduce((acc, m) => {
    const period = periodKey(activeYear, m)
    const statuses = rows
      .filter(({ contract }) => inMonth(contract, activeYear, m))
      .map(({ contract }) =>
        paymentTone(contract.paymentStatusByPeriod?.[period]?.status),
      )
      .filter(Boolean)
    if (statuses.length) {
      acc[m] = statuses.includes('awaiting') ? 'awaiting' : 'paid'
    }
    return acc
  }, {})

  // Выбран месяц — и таблица, и сводка считаются только по нему.
  const scoped =
    activeMonth == null
      ? rows
      : rows.filter(({ contract }) =>
          inMonth(contract, activeYear, activeMonth),
        )

  const query = q.trim().toLowerCase()
  const filtered = scoped.filter(({ contract, advertiser }) =>
    `${advertiser.name} ${contract.legalName ?? ''} ${
      contract.campaignName ?? ''
    }`
      .toLowerCase()
      .includes(query),
  )

  const paid = scoped.filter(
    ({ contract }) => statusAt(contract, activePeriod) === 'paid',
  ).length
  // Все поступления по видимым договорам — от свежих к старым.
  const payments = scoped
    .flatMap(({ contract, advertiser }) =>
      (contract.payments ?? []).map((payment) => ({
        ...payment,
        contractTitle: contractTitle(contract),
        brand: advertiser.name,
      })),
    )
    .sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))

  // Суммы ведутся по договорам — здесь складываем их по всем видимым.
  // Месяц закрыт по договору — значит он оплачен полностью: показываем 100%
  // и нулевой остаток, даже если в самой записи освоено меньше.
  const spentOf = (contract) =>
    activePeriod && statusAt(contract, activePeriod) === 'paid'
      ? toNumber(contract.budget)
      : toNumber(contract.spent)

  const money = scoped.reduce(
    (acc, { contract }) => ({
      budget: acc.budget + toNumber(contract.budget),
      spent: acc.spent + spentOf(contract),
    }),
    { budget: 0, spent: 0 },
  )

  /**
   * Суммы договора. Прирост «Оплачено» сервер сам оформляет поступлением
   * на выбранную дату — отдельного запроса на платёж не нужно.
   */
  const saveMoney = ({ budget, spent, paidAt }) => {
    const contract = moneyRow?.contract
    if (!contract) return
    const gained = spent - toNumber(contract.spent)

    saveAmounts(
      {
        id: contract.id,
        // Суммы на сервере — decimal, то есть строки.
        input: { budget: String(budget), spent: String(spent), paidAt },
      },
      {
        // Поповер намеренно не закрываем — можно внести следующее поступление.
        onSuccess: () =>
          toast.success(
            gained > 0
              ? `Поступление по договору «${contractTitle(contract)}» внесено`
              : `Суммы договора «${contractTitle(contract)}» обновлены`,
          ),
        onError: (err) =>
          toast.error(err.message || 'Не удалось сохранить суммы договора'),
      },
    )
  }

  /** Правка даты и времени уже внесённого поступления. */
  const editPayment = (paymentId, localValue) => {
    const contract = moneyRow?.contract
    if (!contract || !localValue) return
    const paidAt = new Date(localValue)
    if (Number.isNaN(paidAt.getTime())) return

    updatePayment(
      {
        contractId: contract.id,
        paymentId,
        input: { paidAt: paidAt.toISOString() },
      },
      {
        onError: (err) =>
          toast.error(err.message || 'Не удалось изменить поступление'),
      },
    )
  }

  /** Удаление поступления: сумма вычитается из оплаченного по договору. */
  const removePayment = async (paymentId) => {
    const contract = moneyRow?.contract
    const entry = (contract?.payments ?? []).find(
      (item) => item.id === paymentId,
    )
    if (!entry) return

    const ok = await confirm({
      title: 'Удалить поступление?',
      description: `${formatMoneyCompact(entry.amount)} · ${formatDateTime(
        entry.paidAt,
      )}`,
      body: 'Сумма вычтется из оплаченного по договору.',
    })
    if (!ok) return

    deletePayment(
      { contractId: contract.id, paymentId },
      {
        onSuccess: () => toast.info('Поступление удалено'),
        onError: (err) =>
          toast.error(err.message || 'Не удалось удалить поступление'),
      },
    )
  }

  /** Статус оплаты ставится на месяц договора: ключ вида 2026-08. */
  const savePaymentStatus = (next, changedAt, period) => {
    const contract = paymentRow?.contract
    if (!contract) return
    setPaymentAnchor(null)

    savePaymentStatusFor(
      {
        id: contract.id,
        input: {
          status: next,
          period,
          // Дату выбирают в поповере — смену можно оформить задним числом.
          changedAt: changedAt ?? new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          const [statusYear, statusMonth] = period.split('-')
          toast.success(
            `Договор «${contractTitle(contract)}», ${MONTHS_FULL[
              Number(statusMonth) - 1
            ].toLowerCase()} ${statusYear}: ${CONTRACT_PAYMENT[next].label}`,
          )
        },
        onError: (err) =>
          toast.error(err.message || 'Не удалось изменить статус оплаты'),
      },
    )
  }

  /** Правка из таблицы — только статус договора. */
  const setStatus = (contract, next) => {
    if (next === (contract.status ?? 'active')) return
    updateContract(
      { id: contract.id, input: { status: next } },
      {
        onSuccess: () =>
          toast.success(
            `Договор «${contractTitle(contract)}» — ${CONTRACT_STATUS[next].label.toLowerCase()}`,
          ),
        onError: (err) =>
          toast.error(err.message || 'Не удалось изменить статус договора'),
      },
    )
  }

  // Пока договоров нет, сводка показывала бы нули — оставляем одно ожидание.
  if (isPending) return <Loader label="Загружаем договоры…" />

  return (
    <FadeIn>
      <PageHeader
        title="Договоры"
        subtitle="Бюджеты, поступления и статусы оплаты по всем договорам брендов."
      />

      {/* Сводка по договорам — сразу видно, сколько ждёт оплату. */}
      <div className="mb-5 grid gap-px border border-line bg-line sm:grid-cols-3">
        <Tile
          label={
            activeMonth == null
              ? 'Всего договоров'
              : `Договоров за ${MONTHS_FULL[activeMonth].toLowerCase()}`
          }
          value={scoped.length}
        />
        {/* Прибыль — внутренняя цифра площадки, рекламодателю показываем оплату. */}
        <MoneyTile
          label={`${isAdvertiser ? 'Бюджет / Оплачено' : 'Бюджет / Прибыль'}${
            activeMonth == null
              ? ''
              : ` · ${MONTHS_FULL[activeMonth].toLowerCase()} ${activeYear}`
          }`}
          budget={money.budget}
          spent={money.spent}
          hint={`Оплачено договоров: ${paid}. Нажмите — история выплат`}
          open={showPayments}
          onToggle={() => setShowPayments((v) => !v)}
        />
        {/* Остаток — сколько по договорам ещё не закрыто деньгами. */}
        <Tile
          label="Остаток по оплатам"
          value={formatMoneyCompact(money.budget - money.spent)}
          tone={money.budget - money.spent > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* История выплат по всем договорам сводки — раскрывается с плитки. */}
      {showPayments && (
        <Card className="mb-5 p-5">
          <p className="eyebrow text-ink-muted">История выплат</p>
          <div className="mt-3 max-h-[260px] space-y-1.5 overflow-y-auto">
            {payments.length === 0 ? (
              <p className="rounded-xl bg-paper px-3 py-3 text-center text-[12px] text-ink-muted">
                Поступлений пока не было.
              </p>
            ) : (
              payments.map((payment, i) => (
                <div
                  key={payment.id}
                  className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2"
                >
                  <span className="w-5 shrink-0 text-[12px] text-ink-muted tnum">
                    {i + 1}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-muted tnum">
                    {formatDateTime(payment.paidAt)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-ink-soft">
                    {payment.brand} · {payment.contractTitle}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold text-emerald-700 tnum">
                    + {formatMoney(payment.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Поиск договора"
            placeholder="Поиск по договору"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted focus-ring focus-visible:border-indigo-300"
          />
        </div>
      </div>

      {/* Месяцы — тот же фильтр периода, что в кампаниях. */}
      <div className="mb-5 overflow-x-auto">
        <MonthTabs
          year={activeYear}
          years={years}
          onYearChange={setYear}
          value={activeMonth}
          onChange={setMonth}
          counts={monthCounts}
          statuses={monthStatuses}
        />
      </div>

      {isError ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="Не удалось загрузить договоры"
            description={error?.message ?? 'Попробуйте ещё раз.'}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Повторить
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title={rows.length ? 'Ничего не нашлось' : 'Договоров нет'}
            description={
              activeMonth != null
                ? `За ${MONTHS_FULL[activeMonth].toLowerCase()} ${activeYear} договоров нет — снимите фильтр месяца.`
                : rows.length
                  ? 'Попробуйте изменить запрос.'
                  : 'Договоры появятся здесь, как только их заведут в карточке бренда.'
            }
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="eyebrow border-b border-line bg-ink/[0.03] text-left text-ink-muted">
                <Th className="w-10">№</Th>
                <Th>Организация</Th>
                <Th>Договор</Th>
                <Th className="text-center">
                  {isAdvertiser ? 'Бюджет / Оплачено' : 'Бюджет / Прибыль'}
                </Th>
                <Th className="text-right">Остаток</Th>
                <Th>Оплата</Th>
                <Th>Статус</Th>
                <Th className="text-center">Действия</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ contract, advertiser }, i) => {
                const budget = toNumber(contract.budget)
                const spent = spentOf(contract)
                const pacing = budget ? (spent / budget) * 100 : 0
                // Остаток — сколько по договору ещё не закрыто деньгами.
                const rest = budget - spent
                const status = CONTRACT_STATUS[contract.status ?? 'active']
                return (
                  <motion.tr
                    key={contract.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min(i, 12) * 0.03,
                      duration: 0.3,
                    }}
                    className="border-b border-line/20 transition-colors last:border-0 hover:bg-paper"
                  >
                    <Td className="w-10 font-mono text-[11px] text-ink-muted tnum">
                      {i + 1}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar
                          name={advertiser.name}
                          color={advertiser.color}
                          src={advertiserLogo(advertiser)}
                          size="sm"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">
                            {advertiser.name}
                          </span>
                          {contract.legalName && (
                            <span className="block truncate text-[11px] text-ink-muted">
                              {contract.legalName}
                            </span>
                          )}
                        </span>
                      </span>
                    </Td>
                    <Td className="max-w-[220px] font-semibold text-ink">
                      <span className="line-clamp-2">
                        {contractTitle(contract)}
                      </span>
                    </Td>
                    {/* Суммы договора — как в кампаниях: бюджет, освоено, полоса. */}
                    <Td className="w-[200px]">
                      <MoneyCell
                        budget={budget}
                        spent={spent}
                        pacing={pacing}
                        editable={canEditMoney}
                        onOpen={(el) => setMoneyAnchor({ id: contract.id, el })}
                      />
                    </Td>
                    <Td className="whitespace-nowrap text-right font-medium text-ink tnum">
                      {formatMoneyCompact(rest)}
                    </Td>
                    {/* Статус оплаты — за выбранный месяц договора. */}
                    <Td>
                      <PaymentPill
                        status={statusAt(contract, activePeriod)}
                        editable={canEditMoney}
                        onOpen={(el) =>
                          setPaymentAnchor({ id: contract.id, el })
                        }
                      />
                    </Td>
                    <Td>
                      <Badge tone={status.tone} dot>
                        {status.label}
                      </Badge>
                    </Td>
                    <Td>
                      <span className="flex justify-center gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-9 w-9 shrink-0 px-0 hover:border-indigo-400 hover:bg-indigo-100 hover:text-ink"
                          onClick={() => setPreviewId(contract.id)}
                          aria-label={`Открыть договор «${contractTitle(contract)}»`}
                          title="Открыть"
                        >
                          <FolderOpen size={16} />
                        </Button>
                        {canEdit && !isAdvertiser && (
                          <StatusMenu
                            contract={contract}
                            value={contract.status ?? 'active'}
                            onPick={(next) => setStatus(contract, next)}
                          />
                        )}
                      </span>
                    </Td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <ContractPreviewModal
        contract={preview?.contract ?? null}
        advertiser={preview?.advertiser ?? null}
        onClose={() => setPreviewId(null)}
      />

      {moneyRow && (
        <MoneyPopover
          anchorEl={moneyAnchor.el}
          title={contractTitle(moneyRow.contract)}
          budget={toNumber(moneyRow.contract.budget)}
          spent={toNumber(moneyRow.contract.spent)}
          payments={moneyRow.contract.payments ?? []}
          onSave={saveMoney}
          onEditPayment={editPayment}
          onRemovePayment={removePayment}
          onClose={() => setMoneyAnchor(null)}
        />
      )}

      {paymentRow && (
        <StatusPopover
          anchorEl={paymentAnchor.el}
          title={contractTitle(paymentRow.contract)}
          value={statusAt(paymentRow.contract, activePeriod) ?? 'awaiting'}
          options={PAYMENT_OPTIONS}
          history={paymentRow.contract.paymentLog ?? []}
          statusByPeriod={paymentRow.contract.paymentStatusByPeriod ?? {}}
          period={activePeriod ?? periodKey(activeYear, new Date().getMonth())}
          years={years}
          readOnly={!canEditMoney}
          onSave={savePaymentStatus}
          onClose={() => setPaymentAnchor(null)}
        />
      )}
    </FadeIn>
  )
}

// Точка статуса в меню — тон тот же, что у бейджа в таблице.
const DOTS = {
  success: 'bg-success',
  muted: 'bg-ink-muted',
  danger: 'bg-danger',
}

/** Карандаш в строке: меняет только статус договора. */
function StatusMenu({ contract, value, onPick }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <span className="relative" ref={ref}>
      <Button
        variant="secondary"
        size="sm"
        className={`h-9 w-9 shrink-0 px-0 hover:border-indigo-400 hover:bg-indigo-100 hover:text-ink ${
          open ? 'border-indigo-400 bg-indigo-100' : ''
        }`}
        onClick={() => setOpen((v) => !v)}
        aria-label={`Изменить статус договора «${contractTitle(contract)}»`}
        title="Изменить статус"
      >
        <Pencil size={16} />
      </Button>

      {open && (
        <span className="absolute right-0 top-full z-20 mt-1 flex w-48 flex-col overflow-hidden border border-line border-t-[3px] border-t-indigo-500 bg-surface py-1 text-left shadow-lift">
          {Object.entries(CONTRACT_STATUS).map(([key, meta]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setOpen(false)
                onPick(key)
              }}
              className={`flex w-full items-center gap-2 px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                key === value
                  ? 'bg-ink/5 text-ink'
                  : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-sm ${DOTS[meta.tone]}`}
              />
              {meta.label}
              {key === value && (
                <Check size={14} className="ml-auto shrink-0" />
              )}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

/**
 * Ячейка «Бюджет / Прибыль». Площадке она открывает поповер с суммами
 * и поступлениями, остальным просто показывает цифры.
 */
function MoneyCell({ budget, spent, pacing, editable, onOpen }) {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-[12px]">
        <span className="text-ink-muted tnum">
          {formatMoneyCompact(budget)}
        </span>
        <span className="ml-auto font-medium text-ink tnum">
          {formatMoneyCompact(spent)}
        </span>
      </span>
      <Progress
        value={pacing}
        label={formatPct(pacing, 0)}
        className="mt-1.5"
      />
    </>
  )

  if (!editable) return <span className="block">{body}</span>

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      title="Суммы и поступления"
      className="block w-full rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-indigo-50 focus-ring"
    >
      {body}
    </button>
  )
}

/**
 * Статус оплаты за выбранный месяц. Пусто — отметки за этот месяц ещё нет;
 * площадка ставит её тем же поповером, что и в кампаниях.
 */
function PaymentPill({ status, editable, onOpen }) {
  const tone = paymentTone(status)
  const meta = tone ? CONTRACT_PAYMENT[tone] : null
  const label = meta?.label ?? 'Нет отметки'
  const shell = cn(
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2.5 py-1 text-[12px] font-semibold',
    meta ? meta.badge : 'bg-ink/6 text-ink-muted',
  )

  if (!editable) return <span className={shell}>{label}</span>

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      title="Изменить статус оплаты"
      className={cn(shell, 'transition-opacity hover:opacity-80 focus-ring')}
    >
      {label}
    </button>
  )
}

function Th({ children, className }) {
  return (
    <th className={`px-4 py-3 font-semibold ${className ?? ''}`}>{children}</th>
  )
}

function Td({ children, className }) {
  return (
    <td className={`px-4 py-3 align-middle ${className ?? ''}`}>{children}</td>
  )
}

/** Сумма по всем договорам — как карточка «Бюджет / Прибыль» в кампаниях. */
function MoneyTile({ label, budget, spent, hint, open, onToggle }) {
  const pacing = budget ? (spent / budget) * 100 : 0
  return (
    <button
      type="button"
      onClick={onToggle}
      title={hint}
      aria-expanded={open}
      className={`w-full bg-forest p-5 text-left text-white transition-colors hover:bg-forest-soft focus-ring ${
        open ? 'bg-forest-soft' : ''
      }`}
    >
      <p className="eyebrow flex items-center gap-1.5 text-lime-300">
        {label}
        <ChevronDown
          size={13}
          className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </p>
      <p className="mt-3 flex items-baseline gap-2">
        <span className="text-[22px] text-white/45 tnum">
          {formatMoneyCompact(budget)}
        </span>
        <span className="ml-auto font-display text-[24px] font-bold leading-none tracking-[-0.02em] text-white tnum">
          {formatMoneyCompact(spent)}
        </span>
      </p>
      <Progress
        value={pacing}
        tone="lime"
        inverted
        label={formatPct(pacing, 0)}
        className="mt-3"
      />
    </button>
  )
}

function Tile({ label, value, tone }) {
  return (
    <div className="bg-surface p-5">
      <p className="eyebrow text-ink-muted">{label}</p>
      <p
        className={`mt-4 font-display text-[26px] font-bold leading-none tracking-[-0.02em] tnum ${
          tone === 'success'
            ? 'text-success'
            : tone === 'danger'
              ? 'text-danger'
              : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
