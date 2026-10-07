import { useState } from 'react'
import { Check, Pencil, Plus, Ruler, Store } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { usePackages } from '@/features/packages/queries'
import { useAdvertisers } from '@/features/advertisers/queries'
import { PageHeader } from '@/components/PageHeader.jsx'
import { SegmentTabs } from '@/components/ui/Tabs.jsx'
import { Button } from '@/components/ui/Button'
import { Loader } from '@/components/ui/Loader.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { MediaSlider } from '@/components/ui/MediaSlider.jsx'
import { PackageForm } from '@/components/forms/PackageForm.jsx'
import { PACKAGES } from '@/lib/metrics.js'
import { cn } from '@/lib/cn.js'
import { formatMoney, formatNumber } from '@/lib/format.js'

/**
 * Каталог стендов. Вкладки — категории-пакеты Стандарт, VIP, Platinum;
 * внутри каждой свои стенды, например «Стандарт» и «Стандарт (сентябрь)»,
 * и «+», чтобы добавить ещё один. У стенда фото, площадь, цена и что входит.
 * Видят площадка и наблюдатель, правит площадка.
 */
export default function Stands() {
  const { canEdit } = useAuth()
  const { data, isPending, isError, error, refetch } = usePackages()
  const { data: advertisers = [] } = useAdvertisers()
  const [category, setCategory] = useState('standard')
  // Выбранный стенд в каждой категории — чтобы при возврате на вкладку
  // открывался тот же.
  const [picked, setPicked] = useState({})
  const [photoIndex, setPhotoIndex] = useState(0)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)

  const all = data ?? []
  const stands = all.filter((s) => s.category === category)
  const item = stands.find((s) => s.key === picked[category]) ?? stands[0]

  // Сколько договоров заключено по категории — пакет договора это она.
  const contractsIn = (key) =>
    advertisers
      .flatMap((a) => a.contracts ?? [])
      .filter((c) => c.package === key).length

  const switchCategory = (value) => {
    setCategory(value)
    setPhotoIndex(0)
  }

  const pickStand = (key) => {
    setPicked((p) => ({ ...p, [category]: key }))
    setPhotoIndex(0)
  }

  const header = (
    <PageHeader
      title="Выставки"
      subtitle="Каталог: какие стенды есть в каждом пакете и что в них входит."
    />
  )

  if (isPending) {
    return (
      <div>
        {header}
        <Loader label="Загружаем каталог…" />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        {header}
        <EmptyState
          icon={Store}
          title="Не удалось загрузить каталог"
          description={error?.message}
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Повторить
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      {header}

      <SegmentTabs
        className="mb-4"
        value={category}
        onChange={switchCategory}
        items={Object.entries(PACKAGES).map(([key, meta]) => ({
          value: key,
          label: meta.label,
          count: contractsIn(key),
        }))}
      />

      {/* Подкатегории и «+» — добавить ещё одну в эту категорию. */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {stands.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => pickStand(s.key)}
            aria-pressed={s.key === item?.key}
            className={cn(
              'h-9 rounded-md border px-3.5 text-[13px] font-semibold transition-colors focus-ring',
              s.key === item?.key
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-line bg-surface text-ink-soft hover:border-indigo-300 hover:text-ink',
            )}
          >
            {s.name}
          </button>
        ))}
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            className="w-9 px-0"
            onClick={() => setAdding(true)}
            title={`Добавить подкатегорию в «${PACKAGES[category].label}»`}
            aria-label={`Добавить подкатегорию в ${PACKAGES[category].label}`}
          >
            <Plus size={16} />
          </Button>
        )}
      </div>

      {!item ? (
        <EmptyState
          icon={Store}
          title="В категории пока нет подкатегорий"
          description={
            canEdit
              ? 'Нажмите «+», чтобы добавить первую.'
              : 'Их добавляет площадка.'
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {item.photos.length > 0 ? (
            <MediaSlider
              label={`Фото стенда ${item.name}`}
              files={item.photos}
              index={photoIndex}
              onIndex={setPhotoIndex}
              showCaption={false}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-line bg-hatch text-[13px] text-ink-muted">
              Фото стенда ещё не добавлены
            </div>
          )}

          <div className="rounded-xl border border-line bg-surface p-5 corner-ticks">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="eyebrow text-indigo-600">
                  {PACKAGES[item.category]?.label}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink">
                  {item.name}
                </h2>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={14} />
                  Редактировать
                </Button>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-paper/70 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  Цена, сум
                </p>
                <p className="mt-1 font-display text-lg font-bold text-ink tnum">
                  {Number(item.price) ? formatMoney(item.price) : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-paper/70 px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  <Ruler size={12} />
                  Площадь
                </p>
                <p className="mt-1 font-display text-lg font-bold text-ink tnum">
                  {item.area ? `${formatNumber(item.area)} м²` : '—'}
                </p>
              </div>
            </div>

            {item.description && (
              <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
                {item.description}
              </p>
            )}

            {item.features.length > 0 && (
              <>
                <p className="mt-5 text-[11px] font-medium uppercase tracking-wider text-ink-muted">
                  Что входит
                </p>
                <ul className="mt-2 space-y-2">
                  {item.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-[14px] text-ink"
                    >
                      <Check
                        size={16}
                        className="mt-0.5 shrink-0 text-indigo-600"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="mt-5 border-t border-line pt-3 text-[12px] text-ink-muted">
              Договоров по пакету «{PACKAGES[item.category]?.label}»:{' '}
              <span className="font-semibold text-ink tnum">
                {contractsIn(item.category)}
              </span>
            </p>
          </div>
        </div>
      )}

      <PackageForm
        open={editing}
        item={item}
        onClose={() => setEditing(false)}
        onDeleted={() => pickStand(null)}
      />

      {/* «+»: та же форма без item — новая подкатегория в категории. */}
      <PackageForm
        open={adding}
        category={category}
        stands={stands}
        defaultCopyFrom={item?.key}
        onClose={() => setAdding(false)}
        onCreated={(created) => pickStand(created.key)}
      />
    </div>
  )
}
