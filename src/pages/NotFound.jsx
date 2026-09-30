import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/Logo'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-forest px-6 text-center text-white">
      <div className="pointer-events-none absolute inset-0 bg-blueprint bg-size-[32px_32px]" />
      <Logo size={44} inverted className="relative" />
      <div className="relative">
        <p className="eyebrow text-lime-300">Стенд не найден</p>
        <p className="mt-3 font-display text-[96px] font-extrabold leading-none tracking-[-0.04em]">
          404
        </p>
        <p className="mt-3 text-white/60">Такой страницы на плане нет.</p>
      </div>
      <Link to="/app" className="relative">
        <Button variant="lime">К разделам</Button>
      </Link>
    </div>
  )
}
