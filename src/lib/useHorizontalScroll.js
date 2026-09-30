import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Горизонтальная лента, которую крутят колесом мыши прямо над блоками —
 * без полосы прокрутки снизу. Обычное колесо у мыши вертикальное, поэтому
 * переводим его в горизонтальное движение; тачпад и shift+колесо и так
 * дают горизонтальную дельту — их отдаём браузеру как есть.
 *
 * `activeKey` — что-то, меняющееся при переключении вкладки: по нему лента
 * подматывает выбранный элемент в видимую часть, иначе до дальних вкладок
 * приходится долистывать руками.
 *
 * Возвращает ссылку на ленту, признаки «есть куда листать» в каждую сторону
 * и `scrollBy(±1)` — для стрелок.
 */
export function useHorizontalScroll(activeKey) {
  const ref = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const sync = useCallback(() => {
    const node = ref.current
    if (!node) return
    const max = node.scrollWidth - node.clientWidth
    setEdges({
      left: node.scrollLeft > 1,
      // Единица допуска: дробные ширины дают остаток вроде 0.5 пикселя.
      right: node.scrollLeft < max - 1,
    })
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const onWheel = (event) => {
      // Горизонтальный жест уже горизонтальный — не мешаем.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      // Крутить нечего — пусть страница прокручивается как обычно.
      if (node.scrollWidth <= node.clientWidth) return

      const atStart = node.scrollLeft <= 0
      const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1
      // Доехали до края — отдаём прокрутку странице, иначе лента «залипает».
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return

      event.preventDefault()
      node.scrollLeft += event.deltaY
    }

    node.addEventListener('wheel', onWheel, { passive: false })
    node.addEventListener('scroll', sync, { passive: true })
    // Состав ленты и ширина окна меняются — стрелки должны это замечать.
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    sync()

    return () => {
      node.removeEventListener('wheel', onWheel)
      node.removeEventListener('scroll', sync)
      observer.disconnect()
    }
  }, [sync])

  // Переключили вкладку — показываем её целиком.
  useEffect(() => {
    const node = ref.current
    if (!node || activeKey == null) return
    const active = node.querySelector('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeKey])

  /** Листнуть на экран влево (-1) или вправо (+1). */
  const scrollBy = useCallback((direction) => {
    const node = ref.current
    if (!node) return
    // Кому анимации мешают — тому листаем сразу, без прокрутки-«поездки».
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches
    node.scrollBy({
      left: direction * node.clientWidth * 0.8,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [])

  return { ref, canLeft: edges.left, canRight: edges.right, scrollBy }
}
