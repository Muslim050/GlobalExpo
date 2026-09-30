import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn.js'

// Поле — прямоугольник с тонкой рамкой; в фокусе рамка изумрудная, а снизу
// проступает плотная кромка, как у бланка.
const baseControl =
  'w-full rounded-md border border-ink/18 bg-surface px-3.5 text-sm text-ink placeholder:text-ink-muted/80 transition-[border-color,box-shadow] hover:border-ink/35 outline-none focus-visible:border-indigo-500 focus-visible:shadow-[inset_0_-2px_0_var(--color-indigo-500)] disabled:bg-ink/[0.03] disabled:opacity-60'

export interface FieldProps {
  label?: ReactNode
  hint?: ReactNode
  /** Текст ошибки. Непустая строка вытесняет hint. */
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      {label && (
        <span className="flex items-center gap-1 text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-soft">
          {label}
          {required && <span className="text-danger">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-muted">{hint}</span>
      ) : null}
    </label>
  )
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(baseControl, 'h-11', className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseControl, 'min-h-[92px] py-2.5 resize-y', className)}
      {...props}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          baseControl,
          'h-11 appearance-none pr-9 cursor-pointer',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
      />
    </div>
  )
})
