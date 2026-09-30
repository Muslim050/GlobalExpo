import { useState } from 'react'
import { cn } from '@/lib/cn.js'

/**
 * Столбчатый график. data: [{ label, value, color? }]
 */
export function BarChart({ data = [], formatValue = (v) => v, className }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className={cn('flex h-full items-stretch gap-2', className)}>
      {data.map((d, i) => {
        // Пустой месяц — без столбика: заглушка читалась бы как данные.
        const h = d.value ? Math.max((d.value / max) * 100, 2) : 0
        const active = hover === i
        return (
          <div
            key={i}
            className="group relative flex min-w-0 flex-1 flex-col items-center gap-2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            {active && (
              <div className="pointer-events-none absolute -top-9 z-10 whitespace-nowrap bg-forest px-2 py-1 text-[11px] font-bold text-white shadow-lift tnum">
                {formatValue(d.value)}
              </div>
            )}
            {/* Столбик растёт от подписи вверх: высота — доля от колонки. */}
            <div className="flex min-h-0 w-full flex-1 items-end justify-center border-b border-ink/15">
              <div
                className="w-full max-w-14 transition-all duration-300"
                style={{
                  height: `${h}%`,
                  background: d.color || '#0E7745',
                  opacity: hover == null || active ? 1 : 0.4,
                }}
              />
            </div>
            <span className="max-w-full truncate text-[11px] text-ink-muted">
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
