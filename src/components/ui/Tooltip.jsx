import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn.js'

/**
 * Подсказка при наведении.
 * Рисуется порталом в body с position: fixed — иначе её обрезают
 * контейнеры с overflow (например, карточка таблицы).
 */
export function Tooltip({ label, children, className }) {
  const ref = useRef(null)
  const [point, setPoint] = useState(null)

  const show = () => {
    const box = ref.current?.getBoundingClientRect()
    if (box) setPoint({ x: box.left + box.width / 2, y: box.top })
  }
  const hide = () => setPoint(null)

  if (!label) return children

  return (
    <span
      ref={ref}
      className={cn('inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {point &&
        createPortal(
          <span
            role="tooltip"
            style={{ left: point.x, top: point.y }}
            className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap bg-forest px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-lift"
          >
            {label}
            <span className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[5px] border-x-transparent border-t-forest" />
          </span>,
          document.body,
        )}
    </span>
  )
}
