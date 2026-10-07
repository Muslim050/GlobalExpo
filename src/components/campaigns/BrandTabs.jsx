import { useEffect, useRef } from 'react'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { cn } from '@/lib/cn.js'

/**
 * Вкладки брендов над таблицей кампаний: переносятся по строкам, чтобы все
 * бренды были на виду. На узких экранах — лента с прокруткой.
 * items: [{ id, name, color, logo, count, active, sent }], value, onChange
 */
export function BrandTabs({ items, value, onChange, className }) {
  const listRef = useRef(null)
  const activeRef = useRef(null)
  // Выбранный бренд может уехать за край — подтягиваем его в кадр.
  useEffect(() => {
    const list = listRef.current
    const tab = activeRef.current
    if (!list || !tab) return
    const left = tab.offsetLeft
    const right = left + tab.offsetWidth
    if (left < list.scrollLeft) {
      list.scrollTo({ left: left - 8, behavior: 'smooth' })
    } else if (right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: right - list.clientWidth + 8, behavior: 'smooth' })
    }
  }, [value])

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label="Экспоненты"
      className={cn(
        'no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 pt-2.5 md:flex-wrap md:overflow-visible',
        className,
      )}
    >
      {items.map((b) => {
        const active = b.id === value
        return (
          <button
            key={b.id}
            ref={active ? activeRef : null}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(b.id)}
            title={b.name}
            className={cn(
              'flex shrink-0 relative items-center gap-2.5 border py-1.5 pl-1.5 pr-3 transition-colors focus-ring',
              active
                ? 'border-forest bg-forest text-white'
                : 'border-line bg-surface hover:border-ink/30',
            )}
          >
            {b.color ? (
              <Avatar name={b.name} color={b.color} src={b.logo} size="sm" />
            ) : (
              // Вкладка «Все» — бренда нет, поэтому в кружке счётчик,
              // а подложка нейтральная.
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center font-mono text-[11px] font-semibold tnum',
                  active ? 'bg-lime-300 text-forest' : 'bg-ink/6 text-ink-soft',
                )}
              >
                {b.count}
              </span>
            )}
            <span
              className={cn(
                'max-w-[140px] truncate text-[13px] font-semibold',
                active ? 'text-white' : 'text-ink-soft',
              )}
            >
              {b.name}
            </span>
            {/* Счётчик кампаний: в кружке теперь логотип бренда. */}
            {b.color && (
              <span
                className={cn(
                  'px-1.5 font-mono text-[10.5px] font-semibold tnum',
                  active
                    ? 'bg-white/12 text-white/80'
                    : 'bg-ink/6 text-ink-soft',
                )}
                title={`Всего стендов: ${b.count}`}
              >
                {b.count}
              </span>
            )}
            {/* Зелёная метка — сколько кампаний бренда идёт прямо сейчас. */}
            {b.active > 0 && (
              <span
                className={cn(
                  'flex items-center gap-1 px-1.5 font-mono text-[10.5px] font-semibold tnum',
                  active
                    ? 'bg-lime-300/15 text-lime-300'
                    : 'bg-indigo-50 text-indigo-700',
                )}
                title={`Активных стендов: ${b.active}`}
              >
                <span className="h-1.5 w-1.5 bg-current" />
                {b.active}
              </span>
            )}
            {/* Синяя метка со счётчиком — у бренда есть неразобранные заявки. */}
            {b.sent > 0 && (
              <span
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4"
                title={`Новых заявок: ${b.sent}`}
              >
                <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-sky-400 opacity-60" />
                <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-sm bg-sky-500 px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-paper tnum">
                  {b.sent}
                </span>
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
