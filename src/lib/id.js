/** Короткий уникальный id. Использует crypto при наличии. */
export function uid(prefix = 'id') {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}_${rand}`
}

/**
 * Детерминированный псевдослучайный генератор из строкового ключа.
 * Нужен для стабильных «графиков» в моках — при перезагрузке одинаково.
 */
export function seeded(key) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return function next() {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Временной ряд из N точек, детерминированный по ключу. */
export function seededSeries(key, points = 14, base = 100, variance = 0.4) {
  const rnd = seeded(key)
  let value = base
  const out = []
  for (let i = 0; i < points; i++) {
    const drift = (rnd() - 0.45) * variance * base
    value = Math.max(base * 0.25, value + drift)
    out.push(Math.round(value))
  }
  return out
}
