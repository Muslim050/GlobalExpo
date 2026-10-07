import { useEffect, useState } from 'react'
import { Check, FileText, Image as ImageIcon, Plus, Trash2 } from 'lucide-react'
import { Logo } from '@/components/Logo'
import {
  partialSaveOf,
  useSaveAdvertiser,
} from '@/features/advertisers/queries'
import { contractFileInput } from '@/features/contracts/files'
import { newContractKey } from '@/features/contracts/title'
import { fileHref } from '@/features/files/download'
import { useToast } from '@/components/ui/Toast.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import { SegmentTabs } from '@/components/ui/Tabs.jsx'
import { ADV_STATUS, EXHIBITIONS, PACKAGES } from '@/lib/metrics.js'
import { amountField, groupDigits, onlyDigits } from '@/lib/format.js'
import { uid } from '@/lib/id.js'
import { cn } from '@/lib/cn.js'

const PALETTE = [
  '#0E7745',
  '#0EA5E9',
  '#D9A21B',
  '#E5484D',
  '#8B5CF6',
  '#F59E0B',
  '#EC4899',
]

const emptyForm = {
  name: '',
  contact: '',
  email: '',
  category: 'Финансы',
  status: 'active',
  balance: '',
  legalName: '',
  requisites: '',
  color: PALETTE[0],
  // Логотип бренда: { name, url } либо null.
  logo: null,
  contracts: [],
}

/** Слепок договоров — по нему понимаем, менялся ли раздел «Договоры». */
const contractsFingerprint = (contracts = []) =>
  JSON.stringify(
    contracts.map((contract) => ({
      id: contract.id,
      number: (contract.number ?? '').trim(),
      campaignName: (contract.campaignName ?? '').trim(),
      legalName: (contract.legalName ?? '').trim(),
      package: contract.package ?? '',
      exhibition: contract.exhibition ?? '',
      standArea: contract.standArea ?? null,
      // Сумма с сервера — decimal-строка, из формы — цифры: сравниваем числом.
      budget: Math.round(Number(contract.budget) || 0),
      paymentDate: contract.paymentDate ?? '',
      file: contract.file?.url ?? null,
      creative: contract.creative?.url ?? null,
    })),
  )

/**
 * Логотип для формы. Загруженный файл приходит отдельным полем `logoFile`;
 * у брендов, чей логотип лежит на чужом хосте, вместо него ссылка в `logo` —
 * имя файла достаём из неё.
 */
const logoToFile = (advertiser) => {
  const file = advertiser?.logoFile
  if (file?.url) return { ...file }

  const logo = advertiser?.logo
  if (!logo) return null
  return { name: logo.split('/').pop() || 'Логотип', url: logo }
}

const REQUISITES_LABELS = {
  inn: 'ИНН',
  account: 'Р/с',
  bank: 'Банк',
  mfo: 'МФО',
  oked: 'ОКЭД',
  vat: 'НДС',
  address: 'Адрес',
  phone: 'Телефон',
  email: 'Email',
}

/** В старых записях реквизиты лежат объектом — в форме показываем их текстом. */
const requisitesToText = (requisites) => {
  if (!requisites) return ''
  if (typeof requisites === 'string') return requisites
  return Object.entries(REQUISITES_LABELS)
    .filter(([key]) => requisites[key])
    .map(([key, label]) => `${label}: ${requisites[key]}`)
    .join('\n')
}

/**
 * Пустой договор бренда — из него кампания берёт условия. Номер —
 * внутренний ключ, людям не виден: придумываем его сразу.
 */
const newContract = (legalName = '') => ({
  id: uid('ctr'),
  number: newContractKey(),
  // Название договора — рекламная кампания, под которую он заключён.
  campaignName: '',
  legalName,
  // Пакет стенда — из него форма стенда показывает пакет и стоимость.
  package: '',
  exhibition: '',
  // Площадь стенда в м² и стоимость — строками, как их держат поля ввода.
  standArea: '',
  budget: '',
  paymentDate: `${new Date().getFullYear()}-08-31`,
  file: null,
  // Ролик договора — подставляется в кампании по этому договору.
  creative: null,
})

/** Площадь из поля ввода: пусто — null, «12,5» — 12.5. */
const areaOrNull = (value) => {
  const text = String(value ?? '')
    .trim()
    .replace(',', '.')
  return text ? Number(text) : null
}

/** Пустая строка в поле-дате означает «не задано» — сервер ждёт null. */
const dateOrNull = (value) => (value?.trim() ? value : null)

/**
 * Оставляет у договора только то, что принимает API: суммы он здесь
 * не редактирует. Файлы едут отдельными полями — id из загрузчика.
 */
const toContractInput = (contract, before) => ({
  id: contract.id,
  number: contract.number,
  campaignName: (contract.campaignName ?? '').trim(),
  legalName: (contract.legalName ?? '').trim(),
  package: contract.package ?? '',
  exhibition: contract.exhibition ?? '',
  standArea: areaOrNull(contract.standArea),
  // Стоимость уходит отдельным запросом — см. syncContracts.
  budget: onlyDigits(contract.budget) || '0',
  paymentDate: dateOrNull(contract.paymentDate),
  ...contractFileInput(contract, before),
})

/** Карточка с сервера → состояние формы. */
const formFrom = (advertiser) => ({
  name: advertiser.name,
  contact: advertiser.contact,
  email: advertiser.email,
  category: advertiser.category,
  status: advertiser.status,
  balance: String(advertiser.balance),
  legalName: advertiser.legalName || '',
  requisites: requisitesToText(advertiser.requisites),
  color: advertiser.color,
  logo: logoToFile(advertiser),
  contracts: (advertiser.contracts ?? []).map((contract) => ({
    ...contract,
    standArea: contract.standArea == null ? '' : String(contract.standArea),
    // Сумма приходит decimal-строкой — в поле держим целые цифры.
    budget: onlyDigits(amountField(contract.budget)),
  })),
})

export function AdvertiserForm({ open, onClose, initial }) {
  const { mutate: saveAdvertiser, isPending } = useSaveAdvertiser()
  const toast = useToast()
  const editing = !!initial
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [tab, setTab] = useState('main')
  // Подтверждение на кнопке: карточка после сохранения остаётся открытой.
  const [saved, setSaved] = useState(false)
  // Карточка в том виде, в каком она сейчас на сервере. После сохранения
  // заменяется свежим ответом: там уже есть id созданных договоров, и с ним
  // же сравниваются следующие правки.
  const [source, setSource] = useState(initial)
  // Бренд, заведённый в сорванном сохранении. Держим отдельно от source:
  // карточку могло не выйти перечитать, но id уже занят, и повтор должен
  // править его, а не заводить второй.
  const [createdId, setCreatedId] = useState(null)
  const logoPreview = fileHref(form.logo?.url)

  /**
   * Переносит форму на то, что реально лежит на сервере, не трогая ввод:
   * source становится новой опорой для диффа, а договорам, которые успели
   * создаться, локальный id меняется на серверный. Сопоставляем по
   * внутреннему ключу — его форма придумывает договору сразу.
   */
  const adoptServerState = (fresh) => {
    setSource(fresh)
    const savedIdByNumber = new Map(
      (fresh.contracts ?? []).map((contract) => [
        (contract.number ?? '').trim(),
        contract.id,
      ]),
    )
    setForm((current) => ({
      ...current,
      contracts: current.contracts.map((contract) =>
        typeof contract.id === 'number'
          ? contract
          : {
              ...contract,
              id:
                savedIdByNumber.get((contract.number ?? '').trim()) ??
                contract.id,
            },
      ),
    }))
  }

  // Держим «Сохранено» на кнопке и закрываем карточку: список под ней уже
  // перечитан, и правку — например, новый логотип — видно сразу.
  useEffect(() => {
    if (!saved) return
    const timer = setTimeout(onClose, 900)
    return () => clearTimeout(timer)
    // onClose родитель отдаёт новой функцией на каждый рендер: держать его
    // в зависимостях нельзя, иначе обновление списка перезапускало бы таймер.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  useEffect(() => {
    if (!open) return
    setTab('main')
    setSource(initial)
    setCreatedId(null)
    setForm(initial ? formFrom(initial) : emptyForm)
    setErrors({})
    setSaved(false)
    // Зависимости — по id: после сохранения бренд в сторе обновится, и форма
    // иначе сбросила бы несохранённые правки сама на себя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const addContract = () =>
    setForm((f) => ({
      ...f,
      contracts: [...f.contracts, newContract(f.legalName.trim())],
    }))

  const setContract = (id, patch) =>
    setForm((f) => ({
      ...f,
      contracts: f.contracts.map((contract) =>
        contract.id === id ? { ...contract, ...patch } : contract,
      ),
    }))

  const removeContract = (id) =>
    setForm((f) => ({
      ...f,
      contracts: f.contracts.filter((contract) => contract.id !== id),
    }))

  const submit = () => {
    const err = {}
    if (!form.name.trim()) err.name = 'Укажите название'
    if (!form.email.trim() || !form.email.includes('@'))
      err.email = 'Некорректный email'
    setErrors(err)
    if (Object.keys(err).length) return

    const advertiser = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      email: form.email.trim(),
      category: form.category,
      status: form.status,
      // Суммы на сервере — decimal, то есть строка.
      balance: String(Number(form.balance) || 0),
      legalName: form.legalName.trim(),
      requisites: form.requisites.trim(),
      color: form.color,
    }

    // Логотип: файл уходит идентификатором из загрузчика, логотип на чужом
    // хосте — ссылкой. Нетронутый не отправляем вовсе, иначе правка одного
    // поля бренда переписывала бы и его.
    const before = logoToFile(source)
    if ((form.logo?.url ?? null) !== (before?.url ?? null)) {
      if (form.logo?.id) advertiser.logoId = form.logo.id
      else if (!form.logo) {
        advertiser.logoId = null
        advertiser.logo = ''
      } else advertiser.logo = form.logo.url
    }

    // Договоры без названия не сохраняем — их не узнать в кампании.
    const previousById = new Map(
      (source?.contracts ?? []).map((contract) => [contract.id, contract]),
    )
    const contracts = form.contracts
      .filter((contract) => (contract.campaignName ?? '').trim())
      .map((contract) =>
        toContractInput(contract, previousById.get(contract.id)),
      )

    const contractsChanged =
      contractsFingerprint(contracts) !==
      contractsFingerprint(source?.contracts)

    saveAdvertiser(
      {
        id: source?.id ?? createdId,
        advertiser,
        contracts,
        previousAdvertiser: source,
        previousContracts: source?.contracts ?? [],
      },
      {
        onSuccess: (fresh) => {
          // Переносим форму на свежее состояние: если сохранение сорвётся
          // на следующем шаге, повтор не выполнит уже применённые правки.
          setSource(fresh)
          setForm(formFrom(fresh))
          if (editing) {
            // Про договоры говорим отдельно — их правят чаще остального.
            toast.success(
              contractsChanged
                ? `Раздел «Договоры» у экспонента ${advertiser.name} успешно обновлён`
                : `Карточка бренда ${advertiser.name} сохранена`,
            )
            // Карточка закроется сама, показав «Сохранено».
            setSaved(true)
            return
          }
          toast.success(`Экспонент ${advertiser.name} добавлен`)
          onClose()
        },
        onError: (err) => {
          // Цепочка сохранения неатомарна: часть запросов могла примениться
          // до сбоя. Переводим форму на фактическое состояние сервера,
          // сохраняя несохранённый ввод, — иначе повтор завёл бы второй
          // бренд или дубли уже созданных договоров.
          const partial = partialSaveOf(err)
          if (partial) {
            setCreatedId(partial.advertiserId)
            if (partial.advertiser) adoptServerState(partial.advertiser)
          }

          // Сервер вернул ошибки по полям — показываем их прямо в форме.
          if (err.fields && Object.keys(err.fields).length) {
            setErrors(err.fields)
          }

          const message = err.message || 'Не удалось сохранить экспонента'
          toast.error(
            // Бренд завели мы же, в этой попытке: без этой оговорки человек
            // закроет карточку и заведёт его ещё раз.
            partial && !editing
              ? `${message}. Бренд ${advertiser.name} уже заведён — сохраните ещё раз, дубля не будет`
              : message,
          )
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      logo={<Logo size={40} withWord={false} />}
      title={editing ? 'Редактировать экспонента' : 'Новый экспонент'}
      description="Карточка бренда с контактами."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {editing ? 'Закрыть' : 'Отмена'}
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saved || isPending}
          >
            {saved ? (
              <>
                <Check size={16} />
                Сохранено
              </>
            ) : isPending ? (
              'Сохраняем…'
            ) : editing ? (
              'Сохранить'
            ) : (
              'Добавить'
            )}
          </Button>
        </>
      }
    >
      <SegmentTabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'main', label: 'Реквизиты' },
          {
            value: 'contracts',
            label: 'Договоры',
            count: form.contracts.length,
          },
        ]}
      />

      <div className={cn('space-y-4', tab !== 'main' && 'hidden')}>
        <Field label="Название бренда" required error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Например, Artel"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Контактное лицо">
            <Input
              value={form.contact}
              onChange={(e) => set('contact', e.target.value)}
              placeholder="Имя Фамилия"
            />
          </Field>
          <Field label="Email" required error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="name@brand.ru"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Подставляется в договоры бренда и в кампании. */}
          <Field label="Наименование юр. лица">
            <Input
              value={form.legalName}
              onChange={(e) => set('legalName', e.target.value)}
              placeholder="ООО «Пример»"
            />
          </Field>

          {/* Тот же статус, что в плитке бренда: активен или расторгнут. */}
          <Field label="Статус">
            <Select
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {Object.entries(ADV_STATUS).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Реквизиты"
          hint="По строке на пункт: ИНН, банк, счёт, адрес."
        >
          <Textarea
            rows={7}
            value={form.requisites}
            onChange={(e) => set('requisites', e.target.value)}
            className="min-h-[164px]"
            placeholder={
              'ИНН: 311985311\nБанк: ГО АК «Алокабанк», г. Ташкент\nМФО: 00401\nР/с: 20208000407214976001\nАдрес: г. Ташкент, ул. Elbek, 8'
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Цвет бренда">
            <div className="flex flex-wrap gap-2 pt-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('color', c)}
                  className={cn(
                    'h-8 w-8 rounded-sm ring-2 ring-offset-2 ring-offset-surface transition-all',
                    form.color === c
                      ? 'ring-ink/40 scale-110'
                      : 'ring-transparent',
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>

          {/* Логотип показывается вместо инициалов в карточках и таблицах. */}
          <Field
            label="Логотип экспонента"
            hint="Выберите логотип или перетащите файл"
          >
            <div className="flex items-center gap-3">
              {logoPreview && (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
                  <img
                    src={logoPreview}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </span>
              )}
              <FilePicker
                accept="image/*"
                icon={ImageIcon}
                kind="logo"
                emptyLabel="Загрузить логотип"
                name={form.logo?.name}
                url={form.logo?.url}
                addedAt={form.logo?.addedAt}
                onPick={(logo) => set('logo', logo)}
                className="min-w-0 flex-1"
              />
            </div>
          </Field>
        </div>
      </div>

      <div className={cn('space-y-3', tab !== 'contracts' && 'hidden')}>
        {!form.contracts.length && (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center">
            <FileText size={24} className="mx-auto text-ink-muted" />
            <p className="mt-3 text-sm font-medium text-ink-soft">
              Договоров пока нет
            </p>
            <p className="mt-1 text-[13px] text-ink-muted">
              Из этих договоров экспонент выбирает договор при заказе стенда.
            </p>
          </div>
        )}

        {form.contracts.map((contract) => (
          <div
            key={contract.id}
            className="space-y-4 rounded-2xl border border-line bg-paper/55 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="eyebrow truncate text-ink-muted">
                {contract.campaignName?.trim() || 'Новый договор'}
              </p>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 w-8 px-0"
                onClick={() => removeContract(contract.id)}
                title="Удалить договор"
                aria-label={`Удалить договор «${contract.campaignName || 'без названия'}»`}
              >
                <Trash2 size={15} />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Номера у договора нет — его узнают по названию. */}
              <Field label="Название договора" required>
                <Input
                  value={contract.campaignName ?? ''}
                  onChange={(e) =>
                    setContract(contract.id, { campaignName: e.target.value })
                  }
                  placeholder="Например, Artel — сезон выставок"
                />
              </Field>
              <Field
                label="Файл договора"
                hint="Выберите договор или перетащите файл"
              >
                <FilePicker
                  accept=".pdf,.doc,.docx,image/*"
                  kind="contract"
                  emptyLabel="Загрузить договор"
                  downloadLabel="Скачать договор"
                  name={contract.file?.name}
                  url={contract.file?.url}
                  addedAt={contract.file?.addedAt}
                  onPick={(file) => setContract(contract.id, { file })}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Выставка">
                <Select
                  value={contract.exhibition ?? ''}
                  onChange={(e) =>
                    setContract(contract.id, { exhibition: e.target.value })
                  }
                >
                  <option value="">— не выбрана —</option>
                  {EXHIBITIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Пакет">
                <Select
                  value={contract.package ?? ''}
                  onChange={(e) =>
                    setContract(contract.id, { package: e.target.value })
                  }
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

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Площадь, м²">
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  max="1000"
                  step="0.5"
                  value={contract.standArea ?? ''}
                  onChange={(e) =>
                    setContract(contract.id, { standArea: e.target.value })
                  }
                  placeholder="Например, 12"
                />
              </Field>
              <Field label="Стоимость">
                <Input
                  inputMode="numeric"
                  value={groupDigits(contract.budget)}
                  onChange={(e) =>
                    setContract(contract.id, {
                      budget: onlyDigits(e.target.value),
                    })
                  }
                  placeholder="Например, 120 000 000"
                />
              </Field>
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={addContract}>
            <Plus size={16} />
            Добавить договор
          </Button>
          {/* Договоры живут в карточке бренда — сохраняются вместе с ней. */}
          <p className="text-[12px] text-ink-muted">
            Договоры сохранятся вместе с карточкой — нажмите «
            {editing ? 'Сохранить' : 'Добавить'}» внизу.
          </p>
        </div>
      </div>
    </Modal>
  )
}
