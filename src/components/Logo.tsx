import { cn } from '@/lib/cn.js'

export interface LogoProps {
  size?: number
  withWord?: boolean
  /** Логотип на тёмной «вывеске» — надпись становится светлой. */
  inverted?: boolean
  className?: string
}

/** Эмблема Global Expo — лев на глобусе, из фирменного логотипа компании. */
const EMBLEM_SRC = '/brand/global-expo-emblem.png'

export function Logo({
  size = 32,
  withWord = true,
  inverted = false,
  className,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src={EMBLEM_SRC}
        alt={withWord ? '' : 'Global Expo'}
        width={size}
        height={size}
        className="shrink-0 select-none rounded-full"
        style={{ width: size, height: size }}
        draggable={false}
      />
      {withWord && (
        <span
          className={cn(
            'flex min-w-0 flex-col',
            inverted ? 'text-white' : 'text-ink',
          )}
        >
          <span
            className="whitespace-nowrap font-display font-extrabold uppercase leading-none tracking-[0.06em]"
            style={{ fontSize: Math.max(14, size * 0.4) }}
          >
            Global Expo
          </span>
          <span
            className={cn(
              'eyebrow mt-1 whitespace-nowrap leading-none',
              inverted ? 'text-lime-300' : 'text-indigo-600',
            )}
            style={{ fontSize: Math.max(9, size * 0.26) }}
          >
            Ad Platform
          </span>
        </span>
      )}
    </div>
  )
}
