import { cn } from '@/lib/cn.js'

// Карточка — «стенд» на плане: белый прямоугольник в тонкой рамке, без тени.
// Кликабельная при наведении получает тёмную рамку и зелёную кромку сверху.
export function Card({ className, hover = false, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-surface overflow-auto',
        hover &&
          'transition-[border-color,box-shadow] duration-200 hover:border-ink/35 hover:shadow-[inset_0_3px_0_var(--color-indigo-500)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 p-5', className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn(
        'font-display text-[15px] font-bold tracking-[-0.01em] text-ink',
        className,
      )}
      {...props}
    />
  )
}

export function CardBody({ className, ...props }) {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}
