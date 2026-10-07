import { useEffect, useRef, useState } from 'react'
import {
  Building2,
  CalendarClock,
  FileText,
  Check,
  ChevronDown,
  FolderOpen,
  Gauge,
  Landmark,
  Package,
  Ruler,
} from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
// Договоры переехали на сервер. Мок остаётся для разделов, которые ещё
// не подключены: import { useData } from '@/context/DataContext.jsx'
import { useUpdateContract } from '@/features/contracts/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import {
  CONTRACT_STATUS,
  exhibitionLabel,
  packageLabel,
} from '@/lib/metrics.js'
import { contractTitle } from '@/features/contracts/title'
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatMoneyCompact,
  formatNumber,
  formatPct,
} from '@/lib/format.js'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress.jsx'
import { ContractTile } from '@/components/campaigns/CampaignPreviewModal.jsx'
import { cn } from '@/lib/cn.js'
import { advertiserLogo } from '@/features/advertisers/logo'

// Пилюля статуса договора — та же форма, что у статуса кампании.
const PILLS = {
  active: {
    shell: 'border-emerald-200 bg-emerald-50/80 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  completed: {
    shell: 'border-line bg-ink/5 text-ink-soft',
    dot: 'bg-ink-muted',
  },
  terminated: {
    shell: 'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
}

/**
 * Карточка договора: те же плитки, что и в карточке кампании, но условия
 * берём из самого договора. Правки живут в ContractModal — здесь только чтение.
 */
export function ContractPreviewModal({ contract, advertiser, onClose }) {
  const { canEdit, isAdvertiser } = useAuth()
  // const { update } = useData()
  const { mutate: updateContract } = useUpdateContract()
  const toast = useToast()
  const [showPayments, setShowPayments] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef(null)

  // Статус договора ведёт площадка: рекламодателю он только показывается.
  const canEditStatus = canEdit && !isAdvertiser
  const status = contract?.status ?? 'active'

  // Клик мимо списка статусов — закрываем его.
  useEffect(() => {
    const h = (e) =>
      statusRef.current &&
      !statusRef.current.contains(e.target) &&
      setStatusOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const setStatus = (next) => {
    setStatusOpen(false)
    if (next === status) return
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

  // Открыли другой договор — историю снова прячем.
  useEffect(() => {
    setShowPayments(false)
    setStatusOpen(false)
  }, [contract?.id])

  // Суммы приходят decimal-строками — в расчётах они нужны числами.
  const budget = Number(contract?.budget) || 0
  const spent = Number(contract?.spent) || 0
  const pacing = budget ? (spent / budget) * 100 : 0
  const payments = contract?.payments ?? []
  const pill = PILLS[status] ?? PILLS.active

  const tiles = contract
    ? [
        // Юр. лицо — внутренняя кухня, рекламодателю не нужно.
        {
          label: 'Юр. лицо',
          icon: Building2,
          value: isAdvertiser ? null : contract.legalName,
        },
        {
          label: 'Выставка',
          icon: Landmark,
          value: contract.exhibition
            ? exhibitionLabel(contract.exhibition)
            : null,
        },
        {
          label: 'Пакет',
          icon: Package,
          value: packageLabel(contract.package),
        },
        {
          label: 'Площадь стенда',
          icon: Ruler,
          value: contract.standArea
            ? `${formatNumber(contract.standArea)} м²`
            : null,
        },
        {
          label: 'Файл договора',
          icon: FileText,
          value: contract.file?.name,
          // Есть скан — по клику скачивается прямо отсюда.
          file: contract.file,
        },
        {
          label: 'Срок оплаты',
          icon: CalendarClock,
          value: contract.paymentDate ? formatDate(contract.paymentDate) : null,
        },
      ].filter((tile) => tile.value)
    : []

  return (
    <Modal
      open={!!contract}
      onClose={onClose}
      icon={FolderOpen}
      logo={advertiserLogo(advertiser)}
      title={contract ? contractTitle(contract) : 'Договор'}
      description={advertiser?.name || 'Карточка договора'}
      size="lg"
      footer={
        <Button variant="ghost" onClick={onClose}>
          Закрыть
        </Button>
      }
    >
      {contract && (
        <div>
          <div className="relative rounded-2xl border border-line border-t-4 border-t-indigo-500 bg-surface p-5">
            {/* Окружность обрезается своим слоем, а не шапкой: overflow-hidden
                на самой шапке срезал бы выпадающий список статусов. */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
              <div className="pointer-events-none absolute inset-y-0 right-0 w-2/5 bg-grid-fade bg-size-[22px_22px] mask-[linear-gradient(to_left,black,transparent)]" />
            </div>
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-900">
                  Карточка договора
                </p>
              </div>
              {/* Статус договора: площадка меняет его прямо из карточки. */}
              <div className="relative shrink-0" ref={statusRef}>
                <button
                  type="button"
                  disabled={!canEditStatus}
                  onClick={() => setStatusOpen((v) => !v)}
                  title={
                    canEditStatus
                      ? 'Изменить статус договора'
                      : 'Статус договора'
                  }
                  className={cn(
                    'inline-flex max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-[12px] font-semibold transition-colors focus-ring',
                    pill.shell,
                    canEditStatus && 'hover:brightness-[0.97]',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-2 w-2 shrink-0 rounded-sm',
                      pill.dot,
                    )}
                  />
                  <span className="truncate">
                    {CONTRACT_STATUS[status].label}
                  </span>
                  {canEditStatus && (
                    <ChevronDown size={14} className="shrink-0" />
                  )}
                </button>

                {statusOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-lift">
                    {Object.entries(CONTRACT_STATUS).map(([key, meta]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStatus(key)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                          key === status
                            ? 'bg-ink/5 text-ink'
                            : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex h-2 w-2 shrink-0 rounded-sm',
                            PILLS[key].dot,
                          )}
                        />
                        {meta.label}
                        {key === status && (
                          <Check size={14} className="ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {tiles.map((tile) => (
              <ContractTile key={tile.label} {...tile} />
            ))}

            {/* Плитка оплаты: по клику раскрывается история выплат. */}
            <button
              type="button"
              onClick={() => setShowPayments((v) => !v)}
              title="История выплат"
              className="group rounded-2xl border border-line bg-paper/55 p-4 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  {isAdvertiser ? 'Бюджет / Оплачено' : 'Освоение бюджета'}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 transition-transform group-hover:scale-105">
                  <Gauge size={16} />
                </span>
              </div>
              <p className="mt-3 flex items-baseline gap-1.5 text-[15px] font-semibold text-ink tnum">
                {formatMoneyCompact(spent)}
                <span className="text-[12px] font-medium text-ink-muted">
                  из {formatMoneyCompact(budget)}
                </span>
              </p>
              <Progress
                value={pacing}
                label={formatPct(pacing, 0)}
                className="mt-2"
              />
            </button>
          </div>

          {showPayments && (
            <div className="mt-3 rounded-2xl border border-line bg-paper/55 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                История выплат
              </p>
              <div className="mt-3 max-h-[220px] space-y-1.5 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="rounded-xl bg-surface px-3 py-3 text-center text-[12px] text-ink-muted">
                    Поступлений пока не было.
                  </p>
                ) : (
                  payments.map((payment, i) => (
                    <div
                      key={payment.id}
                      className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2"
                    >
                      <span className="w-5 shrink-0 text-[12px] text-ink-muted tnum">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[12px] text-ink-muted tnum">
                        {formatDateTime(payment.paidAt)}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-emerald-700 tnum">
                        + {formatMoney(payment.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
