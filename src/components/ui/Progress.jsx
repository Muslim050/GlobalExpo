import { cn } from '@/lib/cn.js'

/**
 * Тонкий прогресс-бар. value в процентах (0..100+).
 * label — подпись поверх полосы, для неё полосу делают выше.
 * inverted — полоса на тёмной «вывеске»: подпись светлая, на заливке тёмная.
 */
export function Progress({
  value = 0,
  className,
  tone = 'indigo',
  label,
  inverted = false,
}) {
  const pct = Math.max(0, Math.min(100, value))
  const over = value > 100
  const bar = {
    indigo: 'bg-indigo-500',
    lime: 'bg-lime-400',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[over ? 'danger' : tone]

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        inverted ? 'bg-white/12' : 'bg-ink/[0.08]',
        label ? 'h-4' : 'h-1',
        className,
      )}
    >
      <div
        className={cn('h-full transition-all duration-700', bar)}
        style={{ width: `${pct}%` }}
      />
      {label && (
        <>
          <span
            className={cn(
              'absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-semibold tnum',
              inverted ? 'text-white/80' : 'text-ink',
            )}
          >
            {label}
          </span>
          {/* Над заливкой подпись белая: копия текста обрезана по ширине
              полосы, поэтому цифра читается и на зелёном, и на сером. */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute inset-0 flex items-center justify-center font-mono text-[9.5px] font-semibold tnum transition-[clip-path] duration-700',
              inverted ? 'text-forest' : 'text-white',
            )}
            style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          >
            {label}
          </span>
        </>
      )}
    </div>
  )
}
