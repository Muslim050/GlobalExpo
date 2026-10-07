import { useEffect, useState } from 'react'
import { Check, Plus, Store, Trash2 } from 'lucide-react'
import {
  useCreatePackage,
  useDeletePackage,
  useUpdatePackage,
} from '@/features/packages/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { MediaDropzone, MediaSlider } from '@/components/ui/MediaSlider.jsx'
import { PACKAGES } from '@/lib/metrics.js'
import { amountField, groupDigits, onlyDigits } from '@/lib/format.js'

const emptyForm = {
  name: '',
  area: '',
  price: '',
  description: '',
  features: '',
  photos: [],
}

/**
 * Подкатегория с сервера → состояние формы. `withName: false` — когда
 * данные берём у соседней подкатегории для новой: название у неё своё.
 */
const formFrom = (item, { withName = true } = {}) => ({
  name: withName ? (item.name ?? '') : '',
  area: item.area == null ? '' : String(item.area),
  price: onlyDigits(amountField(item.price)),
  description: item.description ?? '',
  // В поле «Что входит» — по пункту на строку.
  features: (item.features ?? []).join('\n'),
  photos: [...(item.photos ?? [])],
})

/**
 * Подкатегория каталога «Стенды»: название, цена в сумах, площадь,
 * описание, что входит и фото.
 *
 * С `item` — правка существующей, без него — новая в категории `category`
 * (кнопка «+»). Для новой поля можно заполнить с соседней подкатегории —
 * `stands` и `defaultCopyFrom`, — а потом поправить. Фото грузятся сразу,
 * а в подкатегорию попадают вместе с остальным — по кнопке сохранения.
 */
export function PackageForm({
  open,
  item,
  category,
  stands = [],
  defaultCopyFrom,
  onClose,
  onCreated,
  onDeleted,
}) {
  const { mutate: createPackage, isPending: creatingNow } = useCreatePackage()
  const { mutate: updatePackage, isPending: updatingNow } = useUpdatePackage()
  const { mutate: deletePackage } = useDeletePackage()
  const toast = useToast()
  const confirm = useConfirm()
  const [form, setForm] = useState(emptyForm)
  const [copyFrom, setCopyFrom] = useState('')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [errors, setErrors] = useState({})

  const creating = !item
  const categoryKey = item?.category ?? category
  const categoryLabel = PACKAGES[categoryKey]?.label ?? ''

  /** Новая подкатегория: поля с выбранной соседней или пустые. */
  const fillFrom = (key) => {
    const source = stands.find((s) => s.key === key)
    setCopyFrom(key)
    setForm(source ? formFrom(source, { withName: false }) : emptyForm)
    setPhotoIndex(0)
  }

  // Заполняем при открытии. Зависимость — ключ подкатегории, иначе
  // сохранение обновит каталог и форма сбросится сама на себя.
  useEffect(() => {
    if (!open) return
    if (item) setForm(formFrom(item))
    else fillFrom(defaultCopyFrom ?? '')
    setPhotoIndex(0)
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.key])

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const save = () => {
    const area = Number(String(form.area).replace(',', '.'))
    const err = {}
    if (!form.name.trim()) err.name = 'Укажите название'
    if (form.area && !(area > 0 && area <= 1000)) {
      err.area = 'Площадь от 0,1 до 1000 м²'
    }
    setErrors(err)
    if (Object.keys(err).length) return

    const input = {
      name: form.name.trim(),
      area: form.area ? area : null,
      price: form.price || '0',
      description: form.description.trim(),
      features: form.features
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      photoIds: form.photos.map((photo) => photo.id),
    }
    const onError = (e) => {
      if (e.fields) setErrors(e.fields)
      toast.error(e.message || 'Не удалось сохранить подкатегорию')
    }

    if (creating) {
      createPackage(
        { ...input, category: categoryKey },
        {
          onSuccess: (created) => {
            toast.success(`Подкатегория «${created.name}» добавлена`)
            onCreated?.(created)
            onClose()
          },
          onError,
        },
      )
      return
    }

    updatePackage(
      { key: item.key, input: { ...input, version: item.version } },
      {
        onSuccess: () => {
          toast.success(`Подкатегория «${input.name}» сохранена`)
          onClose()
        },
        onError,
      },
    )
  }

  const remove = async () => {
    const ok = await confirm({
      title: 'Удалить подкатегорию?',
      description: item.name,
      body: 'Договоры и заказанные стенды это не затронет.',
    })
    if (!ok) return
    deletePackage(item.key, {
      onSuccess: () => {
        toast.info(`Подкатегория «${item.name}» удалена`)
        onClose()
        onDeleted?.()
      },
      onError: (e) =>
        toast.error(e.message || 'Не удалось удалить подкатегорию'),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={creating ? Plus : Store}
      title={
        creating
          ? `Новая подкатегория · ${categoryLabel}`
          : `Подкатегория «${item.name}»`
      }
      description="Цена, площадь, описание и фото стенда."
      size="lg"
      footer={
        <>
          {!creating && (
            <Button variant="danger" className="mr-auto" onClick={remove}>
              <Trash2 size={16} />
              Удалить
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={creatingNow || updatingNow}
          >
            <Check size={16} />
            {creating ? 'Добавить' : 'Сохранить'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Название" required error={errors.name}>
          <Input
            autoFocus={creating}
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={`Например, ${categoryLabel} (сентябрь)`}
          />
        </Field>

        {/* Новой подкатегории поля можно взять у соседней и поправить. */}
        {creating && stands.length > 0 && (
          <Field
            label="Заполнить как у"
            hint="Подставит цену, площадь, описание, состав и фото — их можно поправить."
          >
            <Select value={copyFrom} onChange={(e) => fillFrom(e.target.value)}>
              <option value="">— пустая —</option>
              {stands.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Цена, сум" error={errors.price}>
            <Input
              inputMode="numeric"
              value={groupDigits(form.price)}
              onChange={(e) => set('price', onlyDigits(e.target.value))}
              placeholder="Например, 180 000 000"
            />
          </Field>
          <Field label="Площадь, м²" error={errors.area}>
            <Input
              type="number"
              inputMode="decimal"
              min="0.1"
              max="1000"
              step="0.5"
              value={form.area}
              onChange={(e) => set('area', e.target.value)}
              placeholder="Например, 12"
            />
          </Field>
        </div>

        <Field label="Описание" error={errors.description}>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Где стоит стенд и кому он подходит"
          />
        </Field>

        <Field
          label="Что входит"
          hint="По пункту на строку."
          error={errors.features}
        >
          <Textarea
            rows={5}
            value={form.features}
            onChange={(e) => set('features', e.target.value)}
            placeholder={'Стойка ресепшн\nОсвещение и розетка 220 В'}
          />
        </Field>

        <div>
          <p className="mb-2 text-[13px] font-medium text-ink-soft">
            Фото стенда
          </p>
          {form.photos.length > 0 && (
            <MediaSlider
              className="mb-3"
              label="Фото стенда"
              files={form.photos}
              index={photoIndex}
              onIndex={setPhotoIndex}
              showCaption={false}
              onRemove={(photo) => {
                set(
                  'photos',
                  form.photos.filter((p) => p.id !== photo.id),
                )
                setPhotoIndex((i) => Math.max(0, i - 1))
              }}
            />
          )}
          <MediaDropzone
            kind="package_photo"
            accept="image/*"
            label={
              form.photos.length
                ? 'Перетащите ещё фото или выберите'
                : 'Перетащите фото сюда или выберите'
            }
            onUploaded={(added) => {
              setPhotoIndex(form.photos.length)
              set('photos', [...form.photos, ...added])
            }}
          />
          {errors.photoIds && (
            <p className="mt-1 text-[12px] text-danger">{errors.photoIds}</p>
          )}
        </div>
      </div>
    </Modal>
  )
}
