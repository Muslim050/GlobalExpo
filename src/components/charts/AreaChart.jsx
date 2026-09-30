import { useId, useState } from 'react'
import { useSize } from '@/lib/useSize.js'
import { buildArea } from './paths.js'
import { cn } from '@/lib/cn.js'

/**
 * Интерактивный area-график: ломаная, ровная полупрозрачная заливка, тултип.
 * data: number[], labels?: string[]
 */
export function AreaChart({
  data = [],
  labels = [],
  height = 240,
  color = '#0E7745',
  formatValue = (v) => v,
  className,
}) {
  const [ref, { width }] = useSize()
  const [hover, setHover] = useState(null)
  const gid = useId().replace(/:/g, '')

  const pad = 10
  const axisH = 26
  const w = Math.max(width, 80)
  const chartH = height - axisH
  const { line, area, points } = buildArea(data, w, chartH, pad)

  const stepX = points.length > 1 ? points[1].x - points[0].x : 0

  const onMove = (e) => {
    if (!points.length) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const idx = Math.max(
      0,
      Math.min(points.length - 1, Math.round((x - pad) / (stepX || 1))),
    )
    setHover(idx)
  }

  const hp = hover != null ? points[hover] : null

  return (
    <div
      ref={ref}
      className={cn('relative w-full', className)}
      style={{ height }}
    >
      {width > 0 && (
        <svg
          width={w}
          height={height}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Горизонтальные направляющие */}
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1={pad}
              x2={w - pad}
              y1={pad + (chartH - pad * 2) * t}
              y2={pad + (chartH - pad * 2) * t}
              stroke="currentColor"
              className="text-ink/10"
              strokeDasharray="2 4"
              strokeWidth="1"
            />
          ))}

          <path d={area} fill={`url(#fill-${gid})`} />
          <path
            d={line}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />

          {/* Подписи оси X */}
          {labels.map((lb, i) =>
            i % Math.ceil(labels.length / 6) === 0 ? (
              <text
                key={i}
                x={points[i]?.x}
                y={height - 6}
                textAnchor="middle"
                className="fill-ink-muted font-mono text-[9.5px]"
              >
                {lb}
              </text>
            ) : null,
          )}

          {/* Точка последнего значения */}
          {hp == null && points.length > 0 && (
            <rect
              x={points[points.length - 1].x - 4}
              y={points[points.length - 1].y - 4}
              width="8"
              height="8"
              fill={color}
              stroke="white"
              strokeWidth="2"
            />
          )}

          {/* Наведение */}
          {hp && (
            <>
              <line
                x1={hp.x}
                x2={hp.x}
                y1={pad}
                y2={chartH}
                stroke={color}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                opacity="0.5"
              />
              <rect
                x={hp.x - 5}
                y={hp.y - 5}
                width="10"
                height="10"
                fill={color}
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
      )}

      {/* Тултип */}
      {hp && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full bg-forest px-3 py-1.5 text-white shadow-lift"
          style={{ left: hp.x, top: hp.y - 10 }}
        >
          <div className="font-mono text-[9.5px] uppercase tracking-wider text-white/55">
            {labels[hover]}
          </div>
          <div className="tnum text-sm font-bold">
            {formatValue(data[hover])}
          </div>
        </div>
      )}
    </div>
  )
}
