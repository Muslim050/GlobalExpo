// Утилиты построения SVG-путей для графиков.

/** Ломаная по точкам [{x,y}] — графики Global Expo чертёжные, без сглаживания. */
export function straightLine(points) {
  if (points.length < 2) return ''
  return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
}

/**
 * Готовит точки и пути для area-графика.
 * Возвращает { line, area, points } в координатах вьюпорта w×h.
 */
export function buildArea(values, w, h, pad = 6) {
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const stepX = (w - pad * 2) / Math.max(values.length - 1, 1)
  const points = values.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + (h - pad * 2) * (1 - (v - min) / range),
  }))
  const line = straightLine(points)
  const area = `${line} L ${points[points.length - 1].x} ${h} L ${points[0].x} ${h} Z`
  return { line, area, points }
}
