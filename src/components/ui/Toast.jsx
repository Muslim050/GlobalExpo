import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/cn.js'

/**
 * Тосты — единственное, что компонент отдаёт наружу.
 *
 * @typedef {{
 *   success: (message: string) => void,
 *   error: (message: string) => void,
 *   info: (message: string) => void,
 * }} ToastApi
 */

/** @type {import('react').Context<ToastApi | null>} */
const ToastCtx = createContext(null)

const icons = {
  success: Check,
  error: AlertTriangle,
  info: Info,
}
// Тост — тёмная плашка-«табло» с цветной кромкой слева.
const accents = {
  success: { bar: 'bg-lime-300', icon: 'text-lime-300' },
  error: { bar: 'bg-danger', icon: 'text-[#ff8a8d]' },
  info: { bar: 'bg-white/60', icon: 'text-white/80' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (type, message) => {
      const id = ++idRef.current
      setToasts((t) => [...t, { id, type, message }])
      setTimeout(() => dismiss(id), 3600)
    },
    [dismiss],
  )

  const api = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-5 top-20 z-60 flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
          <AnimatePresence>
            {toasts.map((t) => {
              const Icon = icons[t.type]
              return (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.9, 0.3, 1] }}
                  className="pointer-events-auto relative flex items-center gap-3 overflow-hidden bg-forest py-3 pl-4 pr-3.5 text-white shadow-lift"
                >
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 w-1',
                      accents[t.type].bar,
                    )}
                  />
                  <Icon
                    size={17}
                    strokeWidth={2.5}
                    className={cn('shrink-0', accents[t.type].icon)}
                  />
                  <p className="flex-1 text-[13px] font-medium leading-snug">
                    {t.message}
                  </p>
                  <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Закрыть"
                    className="text-white/50 transition-colors hover:text-white"
                  >
                    <X size={15} />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast должен вызываться внутри <ToastProvider>')
  return ctx
}
