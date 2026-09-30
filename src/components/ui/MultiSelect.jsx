import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn.js'

/**
 * Выпадающий список с мультивыбором.
 * options: [{ id, label }], value: string[], onChange: (nextIds) => void
 */
export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = '— не выбрано —',
  className,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) =>
      ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (id) =>
    onChange(
      value.includes(id) ? value.filter((x) => x !== id) : [...value, id],
    )

  const selected = options.filter((o) => value.includes(o.id))

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex h-11 w-full items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-left text-sm transition-all focus-ring focus-visible:border-indigo-300',
          open && 'border-indigo-300',
        )}
      >
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            selected.length ? 'text-ink' : 'text-ink-muted',
          )}
        >
          {selected.length
            ? selected.map((o) => o.label).join(', ')
            : placeholder}
        </span>
        {selected.length > 1 && (
          <span className="shrink-0 rounded-sm bg-ink/6 px-1.5 text-[11px] text-ink-muted tnum">
            {selected.length}
          </span>
        )}
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-ink-muted transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-surface p-1.5 shadow-lift">
          {options.map((o) => {
            const on = value.includes(o.id)
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggle(o.id)}
                aria-pressed={on}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                  on
                    ? 'bg-indigo-50 text-indigo-900'
                    : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
                    on
                      ? 'border-indigo-400 bg-indigo-100 text-indigo-900'
                      : 'border-line',
                  )}
                >
                  {on && <Check size={12} />}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
