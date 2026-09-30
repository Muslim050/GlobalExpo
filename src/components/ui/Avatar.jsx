import { cn } from '@/lib/cn.js'
import { initials as toInitials } from '@/lib/format.js'
import { fileHref } from '@/features/files/download'

const sizes = {
  sm: 'h-8 w-8 text-[11px] rounded-lg',
  md: 'h-10 w-10 text-xs rounded-xl',
  lg: 'h-12 w-12 text-sm rounded-xl',
}

// Логотипы приходят с белым фоном, поэтому подложка тоже белая.
const logoPadding = {
  sm: 'p-0.5',
  md: 'p-1',
  lg: 'p-1',
}

/**
 * Аватар с инициалами на цветной подложке. src — логотип бренда вместо
 * инициалов, children — произвольное содержимое (например, счётчик).
 */
export function Avatar({
  name = '',
  color = '#0E7745',
  size = 'md',
  className,
  children,
  src,
}) {
  const logo = fileHref(src)

  if (logo && children == null) {
    return (
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-black/5',
          sizes[size],
          className,
        )}
      >
        <img
          src={logo}
          alt={name}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover rounded-xl',
            logoPadding[size],
          )}
        />
      </span>
    )
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold ring-1 ring-black/5',
        sizes[size],
        className,
      )}
      style={{
        background: `linear-gradient(140deg, ${color}, ${shade(color, -18)})`,
        color: contrastColor(color),
      }}
    >
      {children ?? toInitials(name)}
    </span>
  )
}

function contrastColor(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = n >> 16
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return r * 0.299 + g * 0.587 + b * 0.114 > 165 ? '#17161C' : '#FFFFFF'
}

// Простое затемнение hex-цвета для градиента.
function shade(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, Math.min(255, (n >> 16) + percent))
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + percent))
  const b = Math.max(0, Math.min(255, (n & 0xff) + percent))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
