/**
 * Телефоны пользователей — узбекские: код +998 и девять цифр номера,
 * вид «+998 90 123-45-67».
 */
export const PHONE_CODE = '+998'
export const PHONE_LENGTH = 9

/**
 * Цифры номера без кода страны, не больше девяти. Номер целиком
 * («+998 90 123 45 67», «998901234567») тоже понимаем — код отрезаем.
 * Код ищем только у полного номера: девятизначный может и сам начинаться
 * на 998.
 */
export function phoneDigits(value) {
  const digits = String(value ?? '').replace(/\D/g, '')
  const national =
    digits.length >= PHONE_LENGTH + 3 && digits.startsWith('998')
      ? digits.slice(3)
      : digits
  return national.slice(0, PHONE_LENGTH)
}

/** '901234567' → «90 123-45-67»; неполный номер — сколько набрано. */
export function formatPhoneDigits(digits) {
  let out = digits.slice(0, 2)
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`
  if (digits.length > 5) out += `-${digits.slice(5, 7)}`
  if (digits.length > 7) out += `-${digits.slice(7, 9)}`
  return out
}

/** Цифры номера → «+998 90 123-45-67». Пусто — пустая строка. */
export const formatPhone = (digits) =>
  digits ? `${PHONE_CODE} ${formatPhoneDigits(digits)}` : ''
