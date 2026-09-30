import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X, Bell, LogOut, ChevronDown } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
// Бренд рекламодателя берём с сервера:
import { useAdvertiser } from '@/features/advertisers/queries'
import { Logo } from '@/components/Logo'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { userSubtitle, userTitle } from '@/features/auth/user'
import { advertiserLogo } from '@/features/advertisers/logo'
import { cn } from '@/lib/cn.js'
import { DesktopNav } from './Navigation.jsx'

/**
 * Тёмная шапка-«вывеска»: логотип, разделы в строку, профиль. Держится
 * сверху при прокрутке — это единственная навигация приложения.
 */
export function Topbar({ onBurger, mobileNavOpen }) {
  const { user, logout } = useAuth()
  const { data: adv } = useAdvertiser(user?.advertiserId)
  const [menu, setMenu] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) =>
      ref.current && !ref.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Рекламодателя подписываем его брендом, остальных — данными учётной записи.
  const title = adv ? adv.name : userTitle(user)
  const subtitle = adv ? adv.email : userSubtitle(user)

  return (
    <header className="sticky top-0 z-30 border-b border-forest-line bg-forest text-white">
      <div className="mx-auto flex h-16 max-w-[1344px] items-stretch gap-2 px-4 sm:px-6 lg:gap-6">
        <button
          onClick={onBurger}
          aria-label={mobileNavOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={!!mobileNavOpen}
          className="-ml-1 flex w-10 items-center justify-center text-white/70 transition-colors hover:text-white lg:hidden focus-ring"
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link
          to="/app"
          className="flex shrink-0 items-center pr-2 focus-ring lg:border-r lg:border-forest-line lg:pr-6"
        >
          <Logo size={36} inverted />
        </Link>

        <DesktopNav />

        <div className="ml-auto flex items-center gap-1">
          <button
            aria-label="Уведомления"
            className="relative flex h-10 w-10 items-center justify-center text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-ring"
          >
            <Bell size={18} />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 bg-lime-300" />
          </button>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setMenu((v) => !v)}
              aria-expanded={menu}
              className={cn(
                'flex items-center gap-2.5 py-1 pl-1 pr-2 transition-colors hover:bg-white/5 focus-ring',
                menu && 'bg-white/5',
              )}
            >
              <Avatar
                name={title}
                color={adv ? adv.color : '#0E7745'}
                src={advertiserLogo(adv)}
                size="sm"
              />
              <span className="hidden min-w-0 max-w-[160px] text-left xl:block">
                <span className="block truncate text-[12.5px] font-semibold leading-tight">
                  {title}
                </span>
                {subtitle && (
                  <span className="block truncate text-[11px] leading-tight text-white/45">
                    {subtitle}
                  </span>
                )}
              </span>
              <ChevronDown
                size={15}
                className={cn(
                  'text-white/50 transition-transform',
                  menu && 'rotate-180',
                )}
              />
            </button>

            {menu && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-64 border border-line bg-surface text-ink shadow-lift">
                <div className="h-[3px] bg-indigo-500" />
                <div className="px-4 py-3.5">
                  <p className="eyebrow text-ink-muted">Учётная запись</p>
                  <p className="mt-1.5 truncate text-sm font-semibold text-ink">
                    {title}
                  </p>
                  {subtitle && (
                    <p className="truncate text-xs text-ink-muted">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    logout()
                  }}
                  className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold text-danger transition-colors hover:bg-danger/6"
                >
                  <LogOut size={15} />
                  Выйти
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
