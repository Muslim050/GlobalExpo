import { useState, type FormEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, MapPin } from 'lucide-react'
import { isApiError } from '@/api/errors'
import { useLogin } from '@/features/auth/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { cn } from '@/lib/cn.js'

interface Booth {
  /** Номер стенда на плане. */
  code: string
  /** Выставка Global Expo, которую «занимает» стенд. */
  name?: string
  /** Tailwind-классы положения в сетке плана 6×4. */
  area: string
  highlight?: boolean
}

// План павильона 6×4: выставки компании — стенды, свободные места
// заштрихованы. Положение задано явно, чтобы стенды заполняли зал без дыр.
const BOOTHS: Booth[] = [
  {
    code: 'A1',
    name: 'UzCharmExpo',
    area: 'col-[1/3] row-[1/3]',
    highlight: true,
  },
  { code: 'A2', name: 'EURASIA', area: 'col-[3/5] row-[1/2]' },
  { code: 'A3', area: 'col-[5/7] row-[1/2]' },
  { code: 'B1', name: 'Banks & Business Expo', area: 'col-[3/5] row-[2/4]' },
  { code: 'B2', name: 'Maker Faire', area: 'col-[5/7] row-[2/3]' },
  { code: 'C1', name: 'NextStep', area: 'col-[1/3] row-[3/4]' },
  { code: 'C2', area: 'col-[5/6] row-[3/4]' },
  { code: 'C3', area: 'col-[6/7] row-[3/5]' },
  { code: 'D1', name: 'UzCharmStyle', area: 'col-[1/4] row-[4/5]' },
  { code: 'D2', area: 'col-[4/6] row-[4/5]' },
]

function FloorPlan() {
  return (
    <div className="relative">
      <div className="eyebrow mb-3 flex items-center justify-between text-white/40">
        <span>План павильона · Зал 1</span>
        <span className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 border border-white/40" />
            Выставки
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-2 border border-dashed border-white/30" />
            Свободно
          </span>
        </span>
      </div>
      <div className="grid grid-cols-6 grid-rows-[repeat(4,64px)] gap-1.5 border border-white/15 p-1.5 xl:grid-rows-[repeat(4,76px)]">
        {BOOTHS.map((booth, index) => (
          <motion.div
            key={booth.code}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 + index * 0.05, duration: 0.3 }}
            className={cn(
              'relative flex flex-col justify-between p-2.5',
              booth.area,
              booth.highlight
                ? 'bg-lime-300 text-forest'
                : booth.name
                  ? 'border border-white/20 bg-white/[0.04] text-white'
                  : 'border border-dashed border-white/15 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.05)_0_1px,transparent_1px_7px)] text-white/30',
            )}
          >
            <span
              className={cn(
                'font-mono text-[10px] font-semibold tracking-wider',
                booth.highlight ? 'text-forest/60' : 'text-white/35',
              )}
            >
              {booth.code}
            </span>
            {booth.name && (
              <span
                className={cn(
                  'font-display font-bold leading-tight',
                  booth.highlight ? 'text-lg' : 'text-[12.5px]',
                )}
              >
                {booth.name}
              </span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="eyebrow mt-3 flex items-center justify-between text-white/35">
        <span>Вход ↓</span>
        <span>Масштаб 1:200</span>
      </div>
    </div>
  )
}

function ExpoShowcase() {
  return (
    <aside className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-forest px-10 py-10 text-white lg:flex xl:px-16 xl:py-12">
      {/* Чертёжная сетка под всей панелью. */}
      <div className="pointer-events-none absolute inset-0 bg-blueprint bg-size-[32px_32px] mask-[linear-gradient(to_bottom,black,transparent_85%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/10" />

      <div className="relative flex items-center justify-between">
        <Logo size={44} inverted />
        <span className="eyebrow text-white/40">Ташкент · с 2022</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.2, 0.9, 0.3, 1] }}
        className="relative my-10 max-w-[620px]"
      >
        <p className="eyebrow text-lime-300">Рекламная платформа</p>
        <h2 className="mt-4 font-display text-[44px] font-extrabold leading-[1.02] tracking-[-0.035em] xl:text-[56px]">
          Ваш бренд — на&nbsp;главных выставках Узбекистана.
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/60">
          Кампании, договоры, оплаты и отчёты рекламодателей Global Expo —
          в&nbsp;одном кабинете.
        </p>
      </motion.div>

      <div className="relative max-w-[620px]">
        <FloorPlan />
      </div>

      <div className="relative mt-10 flex items-center gap-2 text-[12px] text-white/40">
        <MapPin size={14} />
        Ташкент, улица Янги Олмазор, 6G
      </div>
    </aside>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const toast = useToast()
  const { mutate: signIn, isPending, error } = useLogin()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  // Пароль набирают вслепую и ошибаются — глазик показывает набранное.
  const [passwordShown, setPasswordShown] = useState(false)

  // Сообщение под полем пароля: ошибку формы отдаёт сервер, а сеть
  // и всё остальное сводим к одной понятной фразе.
  const errorMessage = error
    ? isApiError(error)
      ? (error.fields.password ?? error.fields.login ?? error.message)
      : error.message
    : ''

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    signIn(
      { login: username.trim(), password },
      {
        onSuccess: () => {
          toast.success('Вы вошли в Global Expo Ad Platform')
          navigate({ to: '/app/campaigns' })
        },
      },
    )
  }

  return (
    <main className="grid min-h-screen bg-surface lg:grid-cols-[minmax(0,1.25fr)_minmax(440px,0.75fr)]">
      <ExpoShowcase />

      <section className="relative flex flex-col">
        {/* На телефоне тёмной панели нет — бренд держит полоса сверху. */}
        <div className="flex items-center bg-forest px-6 py-4 lg:hidden">
          <Logo size={36} inverted />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.9, 0.3, 1] }}
            className="w-full max-w-[400px]"
          >
            <p className="eyebrow flex items-center gap-2 text-indigo-600">
              <span>01</span>
              <span className="h-px w-6 bg-indigo-500/50" />
              <span className="text-ink-muted">Вход в кабинет</span>
            </p>
            <h1 className="mt-4 font-display text-[32px] font-extrabold leading-[1.08] tracking-[-0.03em] text-ink">
              Добро пожаловать
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Войдите под учётной записью, которую выдал менеджер Global Expo.
            </p>

            <form onSubmit={submit} className="mt-9 space-y-5">
              <Field label="Логин">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  autoFocus
                />
              </Field>

              <Field label="Пароль" error={errorMessage}>
                <div className="relative">
                  <Input
                    type={passwordShown ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    autoComplete="current-password"
                    // Место под кнопку: иначе длинный пароль уезжает под неё.
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordShown((shown) => !shown)}
                    aria-label={
                      passwordShown ? 'Скрыть пароль' : 'Показать пароль'
                    }
                    title={passwordShown ? 'Скрыть пароль' : 'Показать пароль'}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center text-ink-muted transition-colors hover:text-ink focus-ring"
                  >
                    {passwordShown ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </Field>

              <Button
                size="lg"
                variant="primary"
                type="submit"
                className="w-full justify-between"
                disabled={isPending}
              >
                {isPending ? 'Входим…' : 'Войти в платформу'}
                <ArrowRight size={18} />
              </Button>
            </form>
          </motion.div>
        </div>

        <div className="eyebrow flex items-center justify-between border-t border-line px-6 py-4 text-ink-muted sm:px-12">
          <span>© Global Expo</span>
          <span>uzglobalexpo@gmail.com</span>
        </div>
      </section>
    </main>
  )
}
