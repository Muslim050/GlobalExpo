import { cn } from '@/lib/cn.js'

// Бейдж — прямоугольная «табличка» с тонкой рамкой в цвет статуса.
const tones = {
  success: 'bg-success/8 text-success border-success/25',
  warning: 'bg-warning/10 text-warning border-warning/30',
  danger: 'bg-danger/8 text-danger border-danger/25',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  muted: 'bg-ink/[0.04] text-ink-soft border-ink/12',
  lime: 'bg-lime-50 text-lime-600 border-lime-200',
}

export function Badge({ tone = 'muted', className, dot = false, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm border px-2 py-[3px] text-[11.5px] font-semibold leading-tight',
        tones[tone] || tones.muted,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 bg-current" />}
      {children}
    </span>
  )
}
