import { useId } from 'react'
import { buildArea } from './paths.js'

/** Мини-график для карточек метрик. */
export function Sparkline({
  data = [],
  width = 116,
  height = 40,
  color = '#0E7745',
}) {
  const gid = useId().replace(/:/g, '')
  const { line, area } = buildArea(data, width, height, 3)

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.14" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}
