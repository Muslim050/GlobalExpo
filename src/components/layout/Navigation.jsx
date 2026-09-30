import { Link } from '@tanstack/react-router'
import { sectionNo } from '@/lib/nav.js'
import { useNavItems } from '@/lib/useNavItems.js'
import { cn } from '@/lib/cn.js'

/**
 * Разделы в строку, на тёмной шапке. Выбранный — светлый текст
 * с мятной планкой по нижнему краю шапки.
 */
export function DesktopNav() {
  const items = useNavItems()

  return (
    <nav className="hidden h-full items-stretch lg:flex">
      {items.map((it, index) => (
        <Link
          key={it.to}
          to={it.to}
          activeOptions={{ exact: it.end ?? false }}
          className="group relative flex items-center gap-2.5 px-4 text-[13.5px] font-semibold transition-colors focus-ring"
          activeProps={{ className: 'text-white' }}
          inactiveProps={{ className: 'text-white/55 hover:text-white' }}
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'font-mono text-[10px] font-semibold tracking-wider transition-colors',
                  isActive
                    ? 'text-lime-300'
                    : 'text-white/30 group-hover:text-white/50',
                )}
              >
                {sectionNo(index)}
              </span>
              <span className="whitespace-nowrap">{it.label}</span>
              <span
                className={cn(
                  'absolute inset-x-3 bottom-0 h-[3px] transition-all',
                  isActive
                    ? 'bg-lime-300'
                    : 'bg-transparent group-hover:bg-white/15',
                )}
              />
            </>
          )}
        </Link>
      ))}
    </nav>
  )
}

/** Мобильное меню: крупные строки-указатели на тёмном фоне. */
export function MobileNav({ onNavigate }) {
  const items = useNavItems()

  return (
    <nav className="border-b border-forest-line bg-forest px-5 pb-6 pt-2 shadow-lift">
      {items.map((it, index) => (
        <Link
          key={it.to}
          to={it.to}
          activeOptions={{ exact: it.end ?? false }}
          onClick={onNavigate}
          className="group flex items-center gap-4 border-b border-forest-line py-4 transition-colors focus-ring"
          activeProps={{ className: 'text-white' }}
          inactiveProps={{ className: 'text-white/60 hover:text-white' }}
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'font-mono text-[11px] font-semibold',
                  isActive ? 'text-lime-300' : 'text-white/35',
                )}
              >
                {sectionNo(index)}
              </span>
              <it.icon size={18} strokeWidth={1.75} className="shrink-0" />
              <span className="flex-1 font-display text-base font-semibold">
                {it.label}
              </span>
              {isActive && <span className="h-2 w-2 bg-lime-300" />}
            </>
          )}
        </Link>
      ))}
    </nav>
  )
}
