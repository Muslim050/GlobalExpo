import { useLayoutEffect, useRef } from 'react'
import {
  PHONE_CODE,
  PHONE_LENGTH,
  formatPhoneDigits,
  phoneDigits,
} from '@/lib/phone.js'
import { Input } from './Field'

/** Сколько цифр в строке до позиции `pos`. */
const digitsBefore = (text, pos) => text.slice(0, pos).replace(/\D/g, '').length

/** Позиция сразу за `count`-й цифрой строки. */
function positionAfterDigits(text, count) {
  if (count <= 0) return 0
  let seen = 0
  for (let i = 0; i < text.length; i += 1) {
    if (/\d/.test(text[i])) seen += 1
    if (seen === count) return i + 1
  }
  return text.length
}

/**
 * Телефон с маской «+998 90 123-45-67». Код страны — подпись слева, стереть
 * его нельзя; в поле только девять цифр номера, пробел и дефисы ставятся
 * сами. `value` и `onChange` — цифры без кода: '901234567'.
 */
export function PhoneInput({ value, onChange, ...props }) {
  const ref = useRef(null)
  // Каретку после форматирования ставим за ту же по счёту цифру — иначе
  // при правке в середине номера она прыгала бы в конец.
  const caret = useRef(null)

  useLayoutEffect(() => {
    const input = ref.current
    if (caret.current == null || !input) return
    const pos = positionAfterDigits(input.value, caret.current)
    input.setSelectionRange(pos, pos)
    caret.current = null
  })

  const change = (e) => {
    const input = e.target
    const before = digitsBefore(
      input.value,
      input.selectionStart ?? input.value.length,
    )
    let next = phoneDigits(input.value)
    let at = before

    // Стёрли пробел или дефис — цифры те же, и маска вернула бы его на
    // место. Стираем вместо него цифру рядом, как ожидает человек.
    const { inputType } = e.nativeEvent
    if (next === value && inputType === 'deleteContentBackward' && before > 0) {
      next = next.slice(0, before - 1) + next.slice(before)
      at = before - 1
    } else if (next === value && inputType === 'deleteContentForward') {
      next = next.slice(0, before) + next.slice(before + 1)
    }

    caret.current = Math.min(at, next.length)
    onChange(next)
  }

  // Номер, вставленный целиком, заменяет набранное: иначе цифры склеились
  // бы с прежними и код +998 попал бы в номер.
  const paste = (e) => {
    const text = e.clipboardData.getData('text')
    if (text.replace(/\D/g, '').length < PHONE_LENGTH) return
    e.preventDefault()
    const next = phoneDigits(text)
    caret.current = next.length
    onChange(next)
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-ink-soft tnum">
        {PHONE_CODE}
      </span>
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder="90 123-45-67"
        {...props}
        className="pl-[3.1rem] tnum"
        value={formatPhoneDigits(value)}
        onChange={change}
        onPaste={paste}
      />
    </div>
  )
}
