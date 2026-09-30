import { cn } from '@/lib/cn.js'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 bg-hatch px-6 py-16 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center border border-ink/15 bg-surface text-indigo-600 corner-ticks">
          <Icon size={24} strokeWidth={1.75} />
        </div>
      )}
      <div className="space-y-1">
        <p className="font-display text-lg font-bold text-ink">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
