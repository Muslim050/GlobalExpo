import { useState } from 'react'
import { Outlet, useLocation } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { useMe } from '@/features/auth/queries'
import { Topbar } from './Topbar.jsx'
import { MobileNav } from './Navigation.jsx'

/**
 * Каркас приложения: сверху тёмная «вывеска» с разделами, под ней — лист
 * страницы. Бокового меню нет: разделов немного, и они помещаются в строку.
 */
export function AppShell() {
  // Обновляем профиль в шапке актуальными данными с сервера.
  useMe()

  const [mobileNav, setMobileNav] = useState(false)
  const loc = useLocation()

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <Topbar
        mobileNavOpen={mobileNav}
        onBurger={() => setMobileNav((open) => !open)}
      />

      {/* Мобильное меню выезжает из-под шапки на всю ширину. */}
      <AnimatePresence>
        {mobileNav && (
          <motion.div
            className="fixed inset-x-0 bottom-0 top-16 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-forest/50"
              onClick={() => setMobileNav(false)}
            />
            <motion.div
              className="absolute inset-x-0 top-0"
              initial={{ y: -12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.9, 0.3, 1] }}
            >
              <MobileNav onNavigate={() => setMobileNav(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 px-5 pb-12 pt-7 sm:px-8 sm:pt-9">
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="mx-auto max-w-[1280px]"
        >
          <Outlet />
        </motion.div>
      </main>

      <footer className="border-t border-line px-5 py-4 sm:px-8">
        <div className="eyebrow mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 text-ink-muted">
          <span>Global Expo · Ad Platform</span>
          <span>Ташкент · Организация международных выставок</span>
        </div>
      </footer>
    </div>
  )
}
