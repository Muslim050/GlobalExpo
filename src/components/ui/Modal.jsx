import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn.js'
import { fileHref } from '@/features/files/download'

// Сколько держим модалку в DOM после закрытия — ровно на время анимации.
const CLOSE_MS = 220

// Формы и карточки открываются боковой панелью во всю высоту экрана —
// ширина зависит от размера. Короткие предупреждения (sm или без тела)
// остаются диалогом по центру: панель на одну фразу выглядела бы пустой.
const drawerWidths = {
  md: 'sm:w-[520px]',
  lg: 'sm:w-[680px]',
  xl: 'sm:w-[860px]',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  // Логотип бренда — показываем вместо иконки, если он есть.
  logo,
  children,
  footer,
  size = 'md',
}) {
  const logoSrc = fileHref(typeof logo === 'string' ? logo : null)
  const hasBody = children != null && children !== false
  const asDialog = size === 'sm' || !hasBody

  // Размонтируем сами, по таймеру: AnimatePresence в связке с порталом
  // доигрывала анимацию закрытия, но оставляла оверлей в DOM — он перекрывал
  // страницу и гасил все клики.
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), CLOSE_MS)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted) return null

  const mark =
    logo && typeof logo !== 'string' ? (
      <span className="flex shrink-0 items-center">{logo}</span>
    ) : logoSrc ? (
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-white">
        <img
          src={logoSrc}
          alt=""
          className="h-full w-full object-contain p-1"
        />
      </span>
    ) : (
      Icon && (
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center',
            asDialog
              ? 'bg-indigo-50 text-indigo-600'
              : 'bg-lime-300 text-forest',
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
      )
    )

  const header = (
    <div
      className={cn(
        'flex items-start gap-3.5 px-6',
        asDialog
          ? 'pb-2 pt-6'
          : 'border-b border-forest-line bg-forest py-5 text-white',
      )}
    >
      {mark}
      <div className="min-w-0 flex-1 pt-0.5">
        <h2
          className={cn(
            'font-display text-lg font-bold leading-snug tracking-[-0.015em]',
            asDialog ? 'text-ink' : 'text-white',
          )}
        >
          {title}
        </h2>
        {description && (
          <p
            className={cn(
              'mt-1 text-[13px] leading-relaxed',
              asDialog ? 'text-ink-muted' : 'text-white/60',
            )}
          >
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть"
        className={cn(
          '-mr-2 flex h-9 w-9 shrink-0 items-center justify-center transition-colors focus-ring',
          asDialog
            ? 'text-ink-muted hover:bg-ink/6 hover:text-ink'
            : 'text-white/60 hover:bg-white/10 hover:text-white',
        )}
      >
        <X size={19} />
      </button>
    </div>
  )

  const body = hasBody && (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
  )

  const foot = footer && (
    <div
      className={cn(
        'flex items-center justify-end gap-2 px-6 py-4',
        asDialog ? 'pb-6' : 'border-t border-line bg-paper',
      )}
    >
      {footer}
    </div>
  )

  return createPortal(
    <motion.div
      className={cn(
        'fixed inset-0 z-50 flex',
        asDialog ? 'items-center justify-center p-4' : 'justify-end',
        // Пока доигрывает закрытие, кликам мешать нельзя.
        !open && 'pointer-events-none',
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: open ? 1 : 0 }}
      transition={{ duration: CLOSE_MS / 1000 }}
    >
      <div className="absolute inset-0 bg-forest/55" onClick={onClose} />

      {asDialog ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ y: 12, opacity: 0 }}
          animate={open ? { y: 0, opacity: 1 } : { y: 8, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.9, 0.3, 1] }}
          className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden border-t-4 border-indigo-500 bg-surface shadow-lift"
        >
          {header}
          {body}
          {foot}
        </motion.div>
      ) : (
        <motion.div
          role="dialog"
          aria-modal="true"
          initial={{ x: '100%' }}
          animate={{ x: open ? 0 : '100%' }}
          transition={
            open
              ? { type: 'spring', stiffness: 360, damping: 38 }
              : { duration: CLOSE_MS / 1000, ease: 'easeIn' }
          }
          className={cn(
            'relative flex h-full w-full flex-col bg-surface shadow-lift',
            drawerWidths[size] ?? drawerWidths.md,
          )}
        >
          {header}
          {body}
          {foot}
        </motion.div>
      )}
    </motion.div>,
    document.body,
  )
}
