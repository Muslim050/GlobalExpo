import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn.js'

// Кнопки прямоугольные, плотные, без теней: основная — фирменный изумруд
// с белой надписью, при нажатии «проседает» нижней кромкой.
const variants = {
  primary:
    'bg-indigo-500 text-white shadow-inset hover:bg-indigo-600 active:translate-y-px',
  lime: 'bg-lime-300 text-forest shadow-inset hover:bg-lime-400 active:translate-y-px',
  secondary:
    'bg-surface text-ink border border-ink/20 hover:border-ink hover:bg-surface active:translate-y-px',
  ghost: 'text-ink-soft hover:text-ink hover:bg-ink/6',
  danger:
    'bg-surface text-danger border border-danger/35 hover:bg-danger hover:border-danger hover:text-white active:translate-y-px',
  dark: 'bg-forest text-white shadow-inset hover:bg-forest-soft active:translate-y-px',
} as const

const sizes = {
  sm: 'h-9 px-3.5 text-[12.5px] gap-1.5 rounded-md',
  md: 'h-11 px-5 text-[13.5px] gap-2 rounded-md',
  lg: 'h-12 px-6 text-sm gap-2.5 rounded-md',
  icon: 'h-10 w-10 rounded-md',
} as const

export type ButtonVariant = keyof typeof variants
export type ButtonSize = keyof typeof sizes

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = 'primary', size = 'md', type = 'button', ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center font-bold tracking-[0.01em] transition-colors duration-150 focus-ring disabled:opacity-40 disabled:pointer-events-none select-none',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
