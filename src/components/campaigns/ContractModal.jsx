import { useEffect, useState } from 'react'
import { Check, Download, FileText, Film, Trash2 } from 'lucide-react'
import {
  useCreateContract,
  useDeleteContract,
  useSaveCampaignInfo,
  useUpdateContract,
} from '@/features/contracts/queries'
import { contractFileInput } from '@/features/contracts/files'
import { contractTitle, newContractKey } from '@/features/contracts/title'
import { downloadFile } from '@/features/files/download'
import { useAuth } from '@/features/auth/useAuth'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import {
  CONTRACT_STATUS,
  EXHIBITIONS,
  PACKAGES,
  exhibitionLabel,
  packageLabel,
} from '@/lib/metrics.js'
import { formatDate, formatDateTime, formatNumber } from '@/lib/format.js'

const emptyContract = () => ({
  // Договор заводят действующим, дальше статус ведёт площадка.
  status: 'active',
  // Название договора — рекламная кампания, под которую он заключён.
  campaignName: '',
  legalName: '',
  // Пакет стенда — форма стенда показывает его из договора.
  package: '',
  // Выставка договора — форма стенда тоже берёт её отсюда.
  exhibition: '',
  // Площадь стенда в м² — строкой, как её держит поле ввода.
  standArea: '',
  paymentDate: `${new Date().getFullYear()}-08-31`,
  file: null,
  // Ролик договора — его подставляем в кампании по этому договору.
  creative: null,
})

/** Площадь из поля ввода: пусто — null, «12,5» — 12.5. */
const areaOrNull = (value) => {
  const text = String(value ?? '')
    .trim()
    .replace(',', '.')
  return text ? Number(text) : null
}

/** Строка «поле — значение» для режима просмотра. */
function Row({ label, value }) {
  if (!value) return null
  return (
    <div className="flex flex-col gap-0.5 text-[13px] sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="shrink-0 text-ink-muted sm:w-40">{label}</dt>
      <dd className="min-w-0 font-medium text-ink">{value}</dd>
    </div>
  )
}

/**
 * Карточка договора бренда: площадка ведёт название, статус и скан,
 * рекламодатель — название рекламной кампании и ролик. Наблюдателю —
 * только просмотр.
 */
export function ContractModal({ open, contract, advertiser, onClose }) {
  const { mutate: createContract } = useCreateContract()
  const { mutate: updateContract } = useUpdateContract()
  const { mutate: deleteContract } = useDeleteContract()
  const { mutate: saveCampaignInfo } = useSaveCampaignInfo()
  const { isAdvertiser, canEdit } = useAuth()
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(emptyContract)
  const [error, setError] = useState('')
  // Подтверждение прямо на кнопке: тост в углу легко не заметить.
  const [saved, setSaved] = useState(false)

  const creating = !contract
  // Условия договора ведёт площадка, кампанию с роликом — рекламодатель.
  const canEditTerms = canEdit && !isAdvertiser
  const canEditCampaign = canEdit && isAdvertiser && !creating

  // Заполняем форму при открытии. Зависимости — по id, иначе сохранение
  // обновляет бренд в сторе и форма тут же сбрасывается сама на себя.
  useEffect(() => {
    if (!open) return
    setForm(
      contract
        ? { ...contract }
        : { ...emptyContract(), legalName: advertiser?.legalName || '' },
    )
    setError('')
    setSaved(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract?.id, advertiser?.id])

  // Держим «Сохранено» на экране секунду и закрываем карточку.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(onClose, 900)
    return () => clearTimeout(timer)
  }, [saved, onClose])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  /**
   * Поля договора, которые принимает сервер. Номер — внутренний ключ: у
   * нового договора его придумываем сами, у существующего не трогаем.
   */
  const termsInput = (name) => ({
    number: contract?.number ?? newContractKey(),
    campaignName: name,
    legalName: (form.legalName ?? '').trim(),
    package: form.package ?? '',
    exhibition: form.exhibition ?? '',
    standArea: areaOrNull(form.standArea),
    paymentDate: form.paymentDate || null,
    status: form.status ?? 'active',
    ...contractFileInput(form, contract),
  })

  const onSaved = (message) => {
    toast.success(message)
    setSaved(true)
  }

  const onFailed = (err) =>
    toast.error(err.message || 'Не удалось сохранить договор')

  const save = () => {
    // Рекламодатель ведёт только название кампании и ролик — остальные
    // условия договора трогать не даём.
    if (canEditCampaign) {
      saveCampaignInfo(
        {
          id: contract.id,
          input: {
            campaignName: (form.campaignName ?? '').trim(),
            ...contractFileInput(form, contract),
          },
        },
        {
          onSuccess: () => onSaved(`Договор «${contractTitle(form)}» сохранён`),
          onError: onFailed,
        },
      )
      return
    }

    // Номера у договора нет — его узнают по названию, без него не заводим.
    const name = (form.campaignName ?? '').trim()
    if (!name) {
      setError('Укажите название договора')
      return
    }

    if (creating) {
      createContract(
        { advertiserId: advertiser.id, input: termsInput(name) },
        {
          onSuccess: () =>
            onSaved(`Договор «${name}» добавлен бренду ${advertiser.name}`),
          onError: onFailed,
        },
      )
      return
    }

    updateContract(
      { id: contract.id, input: termsInput(name) },
      {
        onSuccess: () => onSaved(`Договор «${name}» сохранён`),
        onError: onFailed,
      },
    )
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Удалить договор?',
      description: contractTitle(contract),
      body: 'Стенды, оформленные по нему, останутся.',
    })
    if (!ok) return

    deleteContract(
      { advertiserId: advertiser.id, id: contract.id },
      {
        onSuccess: () => {
          toast.info('Договор удалён')
          onClose()
        },
        onError: (err) =>
          toast.error(err.message || 'Не удалось удалить договор'),
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={FileText}
      title={creating ? 'Новый договор' : contractTitle(contract)}
      description={advertiser?.name || 'Договор бренда'}
      size="lg"
      footer={
        <>
          {canEditTerms && !creating && (
            <Button variant="danger" onClick={remove} className="mr-auto">
              <Trash2 size={16} />
              Удалить
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            {canEditTerms || canEditCampaign ? 'Отмена' : 'Закрыть'}
          </Button>
          {(canEditTerms || canEditCampaign) && (
            <Button variant="primary" onClick={save} disabled={saved}>
              {saved ? (
                <>
                  <Check size={16} />
                  {creating ? 'Договор добавлен' : 'Сохранено'}
                </>
              ) : creating ? (
                'Добавить'
              ) : (
                'Сохранить'
              )}
            </Button>
          )}
        </>
      }
    >
      {!canEditTerms ? (
        <dl className="space-y-2">
          {/* Название кампании рекламодатель правит ниже, дублировать не нужно. */}
          {!canEditCampaign && <Row label="Стенд" value={form.campaignName} />}
          <Row
            label="Выставка"
            value={form.exhibition ? exhibitionLabel(form.exhibition) : null}
          />
          <Row label="Пакет" value={packageLabel(form.package)} />
          <Row
            label="Площадь стенда"
            value={form.standArea ? `${formatNumber(form.standArea)} м²` : null}
          />
          <Row
            label="Статус"
            value={CONTRACT_STATUS[form.status ?? 'active']?.label}
          />
          <Row
            label="Сроки оплаты"
            value={form.paymentDate ? formatDate(form.paymentDate) : null}
          />
          {form.file && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => downloadFile(form.file)}
                className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper/55 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <FileText size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {form.file.name}
                </span>
                <Download size={15} className="shrink-0 text-ink-muted" />
              </button>
              {form.file.addedAt && (
                <p className="mt-1 text-[11px] text-ink-muted tnum">
                  Добавлен {formatDateTime(form.file.addedAt)}
                </p>
              )}
            </div>
          )}

          {/* Ролик — тем, кто его не правит, показываем ссылкой с датой. */}
          {!canEditCampaign && form.creative && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => downloadFile(form.creative)}
                className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper/55 px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <Film size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {form.creative.name}
                </span>
                <Download size={15} className="shrink-0 text-ink-muted" />
              </button>
              {form.creative.addedAt && (
                <p className="mt-1 text-[11px] text-ink-muted tnum">
                  Добавлен {formatDateTime(form.creative.addedAt)}
                </p>
              )}
            </div>
          )}

          {/* Рекламодатель заполняет кампанию и ролик прямо здесь. */}
          {canEditCampaign && (
            <div className="mt-4 space-y-4 rounded-2xl border border-line bg-paper/40 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Заполняет экспонент
              </p>
              <Field label="Название стенда">
                <Input
                  value={form.campaignName ?? ''}
                  onChange={(e) => set('campaignName', e.target.value)}
                  placeholder="Например, Кондиционеры — лето"
                />
              </Field>
              <Field
                label="Рекламный ролик"
                hint="Выберите ролик или перетащите файл"
              >
                <FilePicker
                  accept="video/*"
                  icon={Film}
                  kind="creative"
                  emptyLabel="Загрузить ролик"
                  downloadLabel="Скачать ролик"
                  name={form.creative?.name}
                  url={form.creative?.url}
                  addedAt={form.creative?.addedAt}
                  onPick={(creative) => set('creative', creative)}
                />
              </Field>
            </div>
          )}
        </dl>
      ) : (
        <div className="space-y-4">
          {/* Номера у договора нет — его узнают по названию. */}
          <Field
            label="Название договора"
            required
            error={error}
            hint="Стенд, под который заключён договор."
          >
            <Input
              value={form.campaignName ?? ''}
              onChange={(e) => {
                set('campaignName', e.target.value)
                setError('')
              }}
              placeholder="Например, Artel — сезон выставок"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Выставка"
              hint="Экспонент увидит её в форме заказа стенда."
            >
              <Select
                value={form.exhibition ?? ''}
                onChange={(e) => set('exhibition', e.target.value)}
              >
                <option value="">— не выбрана —</option>
                {EXHIBITIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Пакет"
              hint="Его экспонент увидит в форме заказа стенда."
            >
              <Select
                value={form.package ?? ''}
                onChange={(e) => set('package', e.target.value)}
              >
                <option value="">— не выбран —</option>
                {Object.entries(PACKAGES).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field
            label="Площадь стенда, м²"
            hint="Подставится в форму заказа стенда."
          >
            <Input
              type="number"
              inputMode="decimal"
              min="0.1"
              max="1000"
              step="0.5"
              value={form.standArea ?? ''}
              onChange={(e) => set('standArea', e.target.value)}
              placeholder="Например, 12"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Файл договора"
              hint="Выберите договор или перетащите файл"
            >
              <FilePicker
                accept=".pdf,.doc,.docx,image/*"
                kind="contract"
                emptyLabel="Загрузить договор"
                downloadLabel="Скачать договор"
                name={form.file?.name}
                url={form.file?.url}
                addedAt={form.file?.addedAt}
                onPick={(file) => set('file', file)}
              />
            </Field>
            {/* Юр. лицо подставляется из карточки бренда, сроки оплаты живут
                в самом договоре — в форме их не спрашиваем. */}
            <Field label="Статус договора">
              <Select
                value={form.status ?? 'active'}
                onChange={(e) => set('status', e.target.value)}
              >
                {Object.entries(CONTRACT_STATUS).map(([key, meta]) => (
                  <option key={key} value={key}>
                    {meta.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          {/* Ролик заполняет рекламодатель — в форме площадки его нет,
              но показываем справкой. */}
          {form.creative && (
            <div className="rounded-2xl border border-line bg-paper/40 p-4">
              <p className="eyebrow text-ink-muted">От экспонента</p>
              <button
                type="button"
                onClick={() => downloadFile(form.creative)}
                className="mt-2 flex w-full items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-left text-[13px] font-medium text-ink transition-colors hover:border-indigo-300 hover:bg-indigo-50 focus-ring"
              >
                <Film size={16} className="shrink-0 text-indigo-800" />
                <span className="min-w-0 flex-1 truncate">
                  {form.creative.name}
                </span>
                <Download size={15} className="shrink-0 text-ink-muted" />
              </button>
              {form.creative.addedAt && (
                <p className="mt-1 text-[11px] text-ink-muted tnum">
                  Ролик добавлен {formatDateTime(form.creative.addedAt)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
