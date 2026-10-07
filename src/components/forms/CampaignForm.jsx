import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
// Кампании переехали на сервер. Мок остаётся для разделов, которые ещё
// не подключены: import { useData } from '@/context/DataContext.jsx'
import { useVisibleAdvertisers } from '@/features/advertisers/queries'
import { useSaveCampaign } from '@/features/campaigns/queries'
import { downloadFile } from '@/features/files/download'
import { contractTitle } from '@/features/contracts/title'
import { useAuth } from '@/features/auth/useAuth'
import { useToast } from '@/components/ui/Toast.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Logo } from '@/components/Logo'
import {
  STATUS,
  exhibitionLabel,
  packageLabel,
  statusLabel,
} from '@/lib/metrics.js'
import { formatMoney, formatNumber } from '@/lib/format.js'

/**
 * Статусы, которых нет в выборе: оплату ведёт договор — помесячно и своим
 * статусом, — поэтому у кампании такой статус её дублировал бы. Архив
 * отсюда тоже не ставится.
 */
const HIDDEN_STATUS = [
  'archived',
  'awaiting_payment',
  'paid',
  // Статусы 3D проекта ставит согласование в карточке стенда, не руками.
  'project_sent',
  'project_rework',
  'project_approved',
]

const emptyForm = {
  name: '',
  objective: 'awareness',
  status: 'sent',
  startDate: '',
  endDate: '',
  contractNumber: '',
  // Бренд стенда — выбирает только площадка на создании.
  advertiserId: null,
}

/** Кампания с сервера → состояние формы. */
const formFrom = (campaign) => ({
  name: campaign.name,
  objective: campaign.objective || 'awareness',
  status: campaign.status,
  startDate: campaign.startDate ?? '',
  endDate: campaign.endDate ?? '',
  contractNumber: campaign.contractNumber || '',
})

/**
 * Заказ и правка стенда. Заказывает рекламодатель — за свой бренд — или
 * площадка за выбранный бренд: тогда сервер ставит статус «Получен».
 * `defaultAdvertiserId` — бренд, который подставить площадке сразу
 * (например, открыта его вкладка).
 */
export function CampaignForm({ open, onClose, initial, defaultAdvertiserId }) {
  const { mutate: saveCampaign, isPending } = useSaveCampaign()
  const { data: advertisers = [] } = useVisibleAdvertisers()
  const { user, isAdmin, isAdvertiser } = useAuth()
  const toast = useToast()
  const editing = !!initial
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})

  // Бренд выбирает площадка, когда сама заказывает стенд: своего бренда у
  // неё нет, и сервер ждёт `advertiserId` в теле.
  const pickBrand = !editing && !isAdvertiser
  // Бренд стенда: у рекламодателя свой — сервер берёт его из сессии, у
  // правимого стенда — его, у нового стенда площадки — выбранный. У уже
  // заведённого стенда бренд не меняется.
  const advertiserId = editing
    ? initial.advertiserId
    : pickBrand
      ? form.advertiserId
      : user?.advertiserId
  const advertiser = advertisers.find((a) => a.id === advertiserId)
  // Договоры бренда — выбираются по названию; внутренний ключ договора
  // уходит на сервер, и условия он подставит в кампанию сам.
  const contracts = advertiser?.contracts ?? []
  const selectedContract = contracts.find(
    (c) => c.number === form.contractNumber,
  )
  useEffect(() => {
    if (!open) return
    setForm(
      initial
        ? formFrom(initial)
        : { ...emptyForm, advertiserId: defaultAdvertiserId ?? null },
    )
    setErrors({})
    // Зависимости — по id: после сохранения список обновится, и форма иначе
    // сбросила бы несохранённые правки сама на себя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  /** Сменили бренд — его договоры другие, выбранный договор сбрасываем. */
  const pickAdvertiser = (id) => {
    setForm((f) => ({ ...f, advertiserId: id, contractNumber: '' }))
    setErrors((e) => ({ ...e, advertiserId: undefined }))
  }

  const submit = () => {
    const err = {}
    if (pickBrand && !form.advertiserId)
      err.advertiserId = 'Выберите экспонента'
    // Отдельного поля названия нет: новый стенд называется по договору,
    // у заведённого название остаётся прежним.
    if (!selectedContract && !editing) err.contractNumber = 'Выберите договор'
    if (!form.startDate) err.startDate = 'Укажите начало периода'
    if (!form.endDate) err.endDate = 'Укажите окончание периода'
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      err.endDate = 'Окончание должно быть позже начала'
    }
    setErrors(err)
    if (Object.keys(err).length) return

    const campaign = {
      name: editing ? form.name : contractTitle(selectedContract),
      objective: form.objective,
      startDate: form.startDate,
      endDate: form.endDate,
      // Условия договора сервер проставляет сам по его ключу: юр. лицо
      // и дату оплаты отправлять не нужно.
      contractNumber: form.contractNumber,
    }
    // Статус ведёт площадка, и только у существующей заявки: новую сервер
    // заводит сам — «Отправлен» у рекламодателя, «Получен» у площадки.
    if (editing && isAdmin) campaign.status = form.status
    // Площадка заказывает стенд за бренд — без него сервер отвечает 400.
    if (pickBrand) campaign.advertiserId = form.advertiserId

    saveCampaign(
      { id: initial?.id, campaign },
      {
        onSuccess: () => {
          if (
            editing &&
            campaign.status &&
            campaign.status !== initial.status
          ) {
            // Смена статуса — событие само по себе, о нём говорим отдельно.
            toast.success(
              `«${campaign.name}»: ${statusLabel(initial.status)} → ${statusLabel(
                campaign.status,
              )}`,
            )
          } else {
            toast.success(
              editing
                ? 'Стенд обновлён'
                : isAdvertiser
                  ? 'Стенд заказан'
                  : 'Стенд создан',
            )
          }
          onClose()
        },
        onError: (err2) => {
          // Сервер вернул ошибки по полям — показываем их прямо в форме.
          if (err2.fields && Object.keys(err2.fields).length) {
            setErrors(err2.fields)
          }
          toast.error(err2.message || 'Не удалось сохранить стенд')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      logo={<Logo size={40} withWord={false} />}
      title={
        editing
          ? 'Редактировать стенд'
          : isAdvertiser
            ? 'Заказать стенд'
            : 'Создать стенд'
      }
      description={
        editing
          ? 'Обновите параметры стенда.'
          : 'Заполните параметры запуска стенда.'
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending ? 'Сохраняем…' : editing ? 'Сохранить' : 'Создать стенд'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Период стенда идёт первым — с него начинают заполнять форму. */}
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-soft">
            Период стенда <span className="text-danger">*</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Начало периода" required error={errors.startDate}>
              <Input
                type="date"
                value={form.startDate}
                max={form.endDate || undefined}
                onChange={(e) => set('startDate', e.target.value)}
              />
            </Field>
            <Field label="Окончание периода" required error={errors.endDate}>
              <Input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={(e) => set('endDate', e.target.value)}
              />
            </Field>
          </div>
        </div>

        {/* После дат площадка выбирает экспонента: от него зависят договоры. */}
        {pickBrand && (
          <Field label="Экспонент" required error={errors.advertiserId}>
            <Select
              value={form.advertiserId ?? ''}
              onChange={(e) => pickAdvertiser(Number(e.target.value) || null)}
            >
              <option value="">— выберите экспонента —</option>
              {[...advertisers]
                .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Площадь и выставку ведёт площадка в договоре — здесь только
              показываем. */}
          <Field
            label="Площадь, м²"
            hint={
              selectedContract ? undefined : 'Появится из выбранного договора.'
            }
          >
            <Input
              value={
                selectedContract?.standArea
                  ? formatNumber(selectedContract.standArea)
                  : ''
              }
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>
          <Field
            label="Выставка"
            hint={
              selectedContract ? undefined : 'Появится из выбранного договора.'
            }
          >
            <Input
              value={
                selectedContract?.exhibition
                  ? exhibitionLabel(selectedContract.exhibition)
                  : ''
              }
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>
        </div>

        {/* Договор задаёт стенду всё: название, пакет, стоимость и условия
            оплаты — сервер подставит их по ключу договора. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Договор"
            required={!editing}
            error={errors.contractNumber}
            hint={
              !advertiserId
                ? 'Сначала выберите экспонента.'
                : contracts.length
                  ? 'Площадь, выставка, пакет, стоимость и условия оплаты подставятся из договора.'
                  : isAdvertiser
                    ? 'У бренда нет договоров — их заводит площадка в карточке экспонента.'
                    : 'У бренда нет договоров — добавьте их в карточке экспонента.'
            }
          >
            <Select
              value={form.contractNumber}
              onChange={(e) => {
                set('contractNumber', e.target.value)
                setErrors((er) => ({ ...er, contractNumber: undefined }))
              }}
              disabled={!contracts.length}
            >
              <option value="">— выберите договор —</option>
              {contracts.map((contract) => (
                <option key={contract.id} value={contract.number}>
                  {contractTitle(contract)}
                </option>
              ))}
            </Select>
          </Field>

          {/* Скан договора: скачивание закрыто токеном, поэтому не ссылка,
              а кнопка — файл тянем транспортом и отдаём блобом. */}
          <Field label="Файл договора">
            {selectedContract?.file?.url ? (
              <button
                type="button"
                onClick={() => downloadFile(selectedContract.file)}
                className="flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <FileText size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {selectedContract.file.name}
                </span>
                <Download size={15} className="shrink-0 text-ink-muted" />
              </button>
            ) : (
              <div className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-line px-3 text-[13px] text-ink-muted">
                <FileText size={16} className="shrink-0" />
                {selectedContract ? 'К договору не приложен' : 'Из договора'}
              </div>
            )}
          </Field>
        </div>

        {/* Пакет и стоимость ведёт площадка в договоре — здесь только
            показываем. Стоимость стенда — сумма договора. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Пакет"
            hint={
              selectedContract ? undefined : 'Появится из выбранного договора.'
            }
          >
            <Input
              value={packageLabel(selectedContract?.package)}
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>

          <Field
            label="Стоимость"
            hint={
              selectedContract ? undefined : 'Появится из выбранного договора.'
            }
          >
            <Input
              value={
                Number(selectedContract?.budget)
                  ? `${formatMoney(selectedContract.budget)} сум`
                  : ''
              }
              placeholder="Из договора"
              disabled
              readOnly
            />
          </Field>
        </div>

        {/* Статус ведёт площадка и только у заведённой заявки. */}
        {isAdmin && editing && (
          <Field label="Статус">
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {Object.entries(STATUS)
                // Скрытый статус оставляем, если он уже стоит у кампании:
                // иначе select показал бы первый вариант и сохранение молча
                // сменило бы статус заявки.
                .filter(
                  ([k]) => !HIDDEN_STATUS.includes(k) || k === form.status,
                )
                .map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
            </Select>
          </Field>
        )}
      </div>
    </Modal>
  )
}
