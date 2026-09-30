import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn.js'
import { useHorizontalScroll } from '@/lib/useHorizontalScroll.js'

// Планка выбранной вкладки: обычная — толстая изумрудная, «soft» — тоньше,
// для длинных рядов вроде названий договоров.
const BARS = {
  accent: 'h-[3px] bg-indigo-500',
  soft: 'h-[2px] bg-indigo-400',
}

// Невыбранная вкладка со статусом: зелёная — оплачено, красная — ждёт денег.
const STATUS_TONES = {
  paid: 'bg-success/[0.07] text-success hover:bg-success/12',
  awaiting: 'bg-danger/[0.07] text-danger hover:bg-danger/12',
}

// Выбранная вкладка со статусом — планка и текст в цвет статуса.
const STATUS_ACTIVE = {
  paid: { bar: 'h-[3px] bg-success', text: 'text-success bg-success/10' },
  awaiting: { bar: 'h-[3px] bg-danger', text: 'text-danger bg-danger/10' },
}

/**
 * Вкладки-указатели с планкой снизу.
 * items: [{ value, label, count?, status?, statusHint? }], value, onChange,
 * tone: accent | soft. `status` (paid | awaiting) красит вкладку в цвет
 * статуса, `statusHint` объясняет её состояние словами — цвет один смысл
 * нести не может, и он же остаётся подсказкой у вкладок без заливки.
 */
export function SegmentTabs({
  items,
  value,
  onChange,
  tone = 'accent',
  className,
}) {
  // Свой layoutId на каждый переключатель: на странице их несколько, с общим
  // id планка перелетала бы из одной группы вкладок в другую.
  const layoutId = useId()
  // Длинный ряд (например, восемь статусов кампании) не помещается в строку.
  // Тогда он прокручивается: колесом над вкладками, выбранная — в виду.
  const { ref } = useHorizontalScroll(value)

  return (
    <div
      ref={ref}
      className={cn(
        'no-scrollbar inline-flex max-w-full items-stretch overflow-x-auto overscroll-x-contain border-b border-line',
        className,
      )}
    >
      {items.map((it) => {
        const active = it.value === value
        const status = !active ? STATUS_TONES[it.status] : null
        const activeStatus = active ? STATUS_ACTIVE[it.status] : null
        return (
          <button
            key={it.value}
            type="button"
            data-active={active}
            onClick={() => onChange(it.value)}
            // Подсказка и подпись для скринридера: по одному цвету статус
            // не прочитать.
            title={it.statusHint ? `${it.label} — ${it.statusHint}` : undefined}
            aria-label={
              it.statusHint ? `${it.label}, ${it.statusHint}` : undefined
            }
            className={cn(
              'relative shrink-0 whitespace-nowrap px-3.5 pb-2.5 pt-2 text-[13px] font-semibold transition-colors focus-ring',
              active
                ? (activeStatus?.text ?? 'text-ink')
                : (status ??
                    'text-ink-muted hover:bg-ink/[0.03] hover:text-ink'),
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className={cn(
                  'absolute inset-x-0 -bottom-px',
                  activeStatus?.bar ?? BARS[tone],
                )}
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {it.label}
              {it.count != null && (
                <span
                  className={cn(
                    'min-w-5 px-1 py-px text-center font-mono text-[10.5px] font-semibold tnum',
                    active
                      ? activeStatus
                        ? 'bg-current/15'
                        : 'bg-indigo-500 text-white'
                      : status
                        ? // На цветной подложке счётчик берёт её же цвет.
                          'bg-surface/80 text-current'
                        : 'bg-ink/[0.07] text-ink-soft',
                  )}
                >
                  {it.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
