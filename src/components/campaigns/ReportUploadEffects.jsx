import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/cn.js'

/**
 * Эффекты загрузки файла отчёта. Сервер разбирает файл одним запросом и
 * прогресса не отдаёт, поэтому ожидание оформлено как «Создание изображения»
 * в ChatGPT: по полю из точек плывёт светящееся пятно, рядом — проценты и
 * что сейчас происходит. Поле полупрозрачное и светлое: при замене файла
 * оно лежит прямо поверх таблицы, и таблица сквозь него видна.
 *
 */

// Этапы идут по таймеру: реального прогресса нет, но разбор файла и правда
// проходит эти шаги, и ожидание не выглядит зависшим.
const STAGES = [
  'Читаем файл',
  'Разбираем листы: эфиры, логи выходов, промо, соцсети',
  'Проверяем даты и время выходов',
  'Собираем отчёт',
]

// Проявление готового отчёта сверху вниз: выше --p всё видно, ниже — нет.
const MASK =
  'linear-gradient(to bottom, #000 var(--p), transparent calc(var(--p) + 22%))'

// Сетка точек: шаг и размер — в CSS-пикселях.
const DOT_GAP = 15
const DOT_MIN = 1
const DOT_MAX = 2.8

// Цвет свечения по яркости: по краям пятна — светлая мята, в центре —
// фирменный изумруд Global Expo. Светлая мята одна на белом почти не видна.
const EDGE = [98, 224, 160]
const CORE = [14, 119, 69]
const mix = (from, to, amount) => Math.round(from + (to - from) * amount)

/**
 * Номер этапа — растёт раз в 1,2 с и замирает на последнем. Реже нельзя:
 * разбор файла идёт секунды две-три, и этапов бы не было видно; чаще —
 * подпись почти всё время была бы в переходе и мигала.
 */
function useStage() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const timer = setInterval(
      () => setStage((current) => Math.min(current + 1, STAGES.length - 1)),
      1200,
    )
    return () => clearInterval(timer)
  }, [])
  return stage
}

/**
 * Проценты — оценка, а не факт: сервер прогресса не сообщает. Бегут быстро
 * в начале и замедляются, не доходя до конца, — ответ сервера и есть 100 %.
 * Разбор обычного файла идёт около 2,5 с: за это время набегает около 70 %.
 */
function useEstimatedProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const timer = setInterval(() => {
      const seconds = (performance.now() - start) / 1000
      setProgress(Math.round(94 * (1 - Math.exp(-seconds / 1.9))))
    }, 120)
    return () => clearInterval(timer)
  }, [])
  return progress
}

/**
 * Поле из точек со светящимся пятном. Два центра ходят по плавным
 * траекториям; чем ближе точка к ним, тем она крупнее и ярче, а на краях
 * пятна тускнеет до фоновой серой. Лёгкая рябь по точкам — чтобы поле
 * «шевелилось», как при генерации картинки.
 *
 * Рисуем на canvas: сотни точек по 60 кадров в секунду DOM не потянул бы.
 */
function DotField({ className }) {
  const canvasRef = useRef(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return undefined

    let width = 0
    let height = 0
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const start = performance.now()
    let frame = 0

    const draw = (now) => {
      // При «уменьшить движение» — один кадр, пятно замирает в центре.
      const t = reduce ? 0 : (now - start) / 1000
      ctx.clearRect(0, 0, width, height)

      // Пятно — локальное, как у GPT: на большой площади (поле на месте
      // таблицы) радиус не растёт дальше потолка, иначе жёлтым заливает всё.
      const size = Math.min(width, height)
      const blobs = [
        {
          x: width * (0.5 + 0.2 * Math.sin(t * 0.55)),
          y: height * (0.5 + 0.18 * Math.cos(t * 0.8)),
          r: Math.min(size * 0.26, 120),
        },
        {
          x: width * (0.5 + 0.24 * Math.cos(t * 0.42 + 1.3)),
          y: height * (0.48 + 0.2 * Math.sin(t * 0.95 + 2.1)),
          r: Math.min(size * 0.19, 90),
        },
      ]

      const cols = Math.floor(width / DOT_GAP)
      const rows = Math.floor(height / DOT_GAP)
      const offsetX = (width - (cols - 1) * DOT_GAP) / 2
      const offsetY = (height - (rows - 1) * DOT_GAP) / 2

      for (let col = 0; col < cols; col += 1) {
        for (let row = 0; row < rows; row += 1) {
          const x = offsetX + col * DOT_GAP
          const y = offsetY + row * DOT_GAP

          let glow = 0
          for (const blob of blobs) {
            const dx = x - blob.x
            const dy = y - blob.y
            glow += Math.exp(-(dx * dx + dy * dy) / (2 * blob.r * blob.r))
          }
          // Рябь: у каждой точки своя фаза — поле мерцает неравномерно.
          const ripple = 0.82 + 0.18 * Math.sin(t * 5 + col * 1.7 + row * 2.3)
          const level = Math.min(1, glow) * ripple

          ctx.beginPath()
          ctx.arc(x, y, DOT_MIN + (DOT_MAX - DOT_MIN) * level, 0, Math.PI * 2)
          ctx.fillStyle =
            level < 0.08
              ? 'rgba(23, 22, 28, 0.14)'
              : `rgba(${mix(EDGE[0], CORE[0], level)}, ${mix(EDGE[1], CORE[1], level)}, ${mix(EDGE[2], CORE[2], level)}, ${0.35 + 0.65 * level})`
          ctx.fill()
        }
      }

      if (!reduce) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [reduce])

  return <canvas ref={canvasRef} aria-hidden className={className} />
}

/** Подпись текущего этапа — сменяется с лёгким сдвигом. */
function StageCaption({ stage, className }) {
  return (
    <span
      className={cn(
        'relative flex h-5 items-center overflow-hidden text-[12px]',
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={stage}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="truncate"
        >
          {STAGES[stage]}…
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/**
 * Разбор файла: поле из точек встаёт прямо на место таблицы — там, где
 * через секунду появится отчёт, как картинка в ChatGPT рисуется в своей же
 * рамке. Так и при первой загрузке, и при замене файла. Заголовок и проценты прилипают к верху
 * экрана: таблица бывает выше окна, а их должно быть видно всё время.
 */
export function TableGenerating({ fileName }) {
  const stage = useStage()
  const progress = useEstimatedProgress()

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      // Полупрозрачный слой: таблица под ним видна и чуть размыта — точки
      // идут прямо поверх неё. Без overflow-hidden: иначе верхняя строка не
      // прилипала бы к экрану.
      className="absolute inset-0 z-20 rounded-3xl bg-surface/55 backdrop-blur-[1.5px]"
    >
      <DotField className="absolute inset-0 block h-full w-full rounded-3xl" />
      <div className="sticky top-20 flex items-start justify-between gap-4 p-5">
        {/* Подписи — на светлой подложке: под ними строки таблицы. */}
        <div className="min-w-0 rounded-2xl bg-surface/85 px-4 py-3 shadow-soft backdrop-blur-sm">
          <p className="text-[14px] font-medium text-ink">Создание отчёта</p>
          <StageCaption stage={stage} className="text-ink-muted" />
          <p className="mt-1 truncate text-[11px] text-ink-muted">{fileName}</p>
        </div>
        <span className="shrink-0 rounded-sm bg-surface/85 px-3 py-1.5 text-[13px] font-medium text-ink shadow-soft tnum backdrop-blur-sm">
          {progress} %
        </span>
      </div>
    </motion.div>
  )
}

/**
 * Проявление настоящего отчёта после загрузки: сверху вниз, из размытия.
 * Играет один раз — на свежем отчёте; при обычном открытии месяца не мешает.
 */
export function Materialize({ play, className, children }) {
  const reduce = useReducedMotion()
  const [done, setDone] = useState(false)

  if (!play || reduce) return <div className={className}>{children}</div>

  return (
    <motion.div
      className={cn(className)}
      initial={{ '--p': '-25%', opacity: 0.35, filter: 'blur(12px)', y: 10 }}
      animate={{
        '--p': '125%',
        opacity: 1,
        filter: 'blur(0px)',
        y: 0,
        // Фильтр после анимации снимаем: он меняет контекст позиционирования
        // и мешал бы липкой шапке таблицы.
        transitionEnd: { filter: 'none' },
      }}
      transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => setDone(true)}
      style={done ? undefined : { maskImage: MASK, WebkitMaskImage: MASK }}
    >
      {children}
    </motion.div>
  )
}
