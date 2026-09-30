import { useLocation } from '@tanstack/react-router'
import { sectionNo } from '@/lib/nav.js'
import { useNavItems } from '@/lib/useNavItems.js'

/**
 * Заголовок раздела в духе выставочного указателя: номер зала моноширинным
 * шрифтом, крупное название и линия во всю ширину с изумрудным отрезком.
 */
export function PageHeader({ title, subtitle, children }) {
  const items = useNavItems()
  const { pathname } = useLocation()
  // Номер берём у раздела меню, внутри которого открыта страница.
  const index = items.findIndex((it) => pathname.startsWith(it.to))
  const section = index >= 0 ? items[index] : null

  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {section && (
            <p className="eyebrow mb-2.5 flex items-center gap-2 text-indigo-600">
              <span>{sectionNo(index)}</span>
              <span className="h-px w-6 bg-indigo-500/50" />
              <span className="text-ink-muted">{section.label}</span>
            </p>
          )}
          {title && (
            <h1 className="font-display text-display-md font-bold text-ink sm:text-display-lg">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-ink-muted">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
      <div className="relative h-px bg-ink/15">
        <span className="absolute left-0 top-[-1px] h-[3px] w-16 bg-indigo-500" />
      </div>
    </div>
  )
}
