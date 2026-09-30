import { useEffect, useState } from 'react'
import { Eye, EyeOff, UserCog } from 'lucide-react'
import { useSaveUser } from '@/features/users/queries'
import { useAdvertisers } from '@/features/advertisers/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { Modal } from '@/components/ui/Modal.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { PhoneInput } from '@/components/ui/PhoneInput.jsx'
import { PHONE_LENGTH, formatPhone, phoneDigits } from '@/lib/phone.js'

// Через платформу заводят только рекламодателей — роль не спрашиваем.
// У уже заведённой площадки или наблюдателя роль берётся из его карточки
// и остаётся прежней: правка контактов не должна менять права.
const DEFAULT_ROLE = 'advertiser'

const emptyForm = {
  firstName: '',
  lastName: '',
  login: '',
  email: '',
  // Цифры номера без кода +998 — маска в поле собирает из них вид.
  phone: '',
  role: DEFAULT_ROLE,
  advertiserId: '',
  isActive: true,
  password: '',
}

/**
 * Имя и фамилия записи. Сервер ведёт их отдельными полями и сам собирает
 * из них `name`; у записей, заведённых до появления этих полей, заполнено
 * только склеенное имя — его делим по первому пробелу, как раньше.
 */
const nameParts = (user) => {
  if (user.firstName || user.lastName) {
    return { firstName: user.firstName ?? '', lastName: user.lastName ?? '' }
  }
  const [firstName = '', ...rest] = (user.name ?? '').trim().split(/\s+/)
  return { firstName, lastName: rest.join(' ') }
}

/** Пользователь с сервера → состояние формы. Пароль наружу не приходит. */
const formFrom = (user) => ({
  ...nameParts(user),
  login: user.login,
  email: user.email ?? '',
  phone: phoneDigits(user.phone),
  role: user.role,
  advertiserId: user.advertiserId ? String(user.advertiserId) : '',
  isActive: user.isActive,
  password: '',
})

/**
 * Карточка пользователя платформы. Заводим здесь только рекламодателей —
 * им нужно указать, чей раздел человек будет видеть.
 */
export function UserForm({ open, onClose, initial }) {
  const { mutate: saveUser, isPending } = useSaveUser()
  // Список тот же, что и в разделе «Рекламодатели».
  const { data: advertisers } = useAdvertisers()
  const toast = useToast()
  const editing = !!initial
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [passwordShown, setPasswordShown] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(initial ? formFrom(initial) : emptyForm)
    setErrors({})
    // Открыли снова — пароль опять скрыт.
    setPasswordShown(false)
    // Зависимости — по id: после сохранения список обновится, и форма иначе
    // сбросила бы несохранённые правки сама на себя.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const err = {}
    if (!form.login.trim()) err.login = 'Укажите логин'
    if (form.email.trim() && !form.email.includes('@'))
      err.email = 'Некорректный email'
    if (form.phone && form.phone.length < PHONE_LENGTH)
      err.phone = 'Номер неполный: после +998 нужно 9 цифр'
    // Пароль обязателен только у нового: у существующего пустое поле значит
    // «оставить прежний».
    if (!editing && !form.password) err.password = 'Задайте пароль'
    if (form.role === 'advertiser' && !form.advertiserId)
      err.advertiserId = 'Выберите рекламодателя'
    setErrors(err)
    if (Object.keys(err).length) return

    const user = {
      login: form.login.trim(),
      // `name` не отправляем: сервер собирает его из имени и фамилии сам.
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: formatPhone(form.phone),
      role: form.role,
      // Связка есть только у рекламодателя — у остальных ролей её снимаем.
      advertiserId:
        form.role === 'advertiser' ? Number(form.advertiserId) : null,
      isActive: form.isActive,
    }
    if (form.password) user.password = form.password

    saveUser(
      { id: initial?.id, user },
      {
        onSuccess: () => {
          toast.success(
            editing
              ? `Пользователь ${user.login} сохранён`
              : `Пользователь ${user.login} добавлен`,
          )
          onClose()
        },
        onError: (err2) => {
          // Сервер вернул ошибки по полям — показываем их прямо в форме.
          if (err2.fields && Object.keys(err2.fields).length) {
            setErrors(err2.fields)
          }
          toast.error(err2.message || 'Не удалось сохранить пользователя')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UserCog}
      title={editing ? 'Редактировать пользователя' : 'Новый пользователь'}
      description="Доступ к платформе."
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={isPending}>
            {isPending ? 'Сохраняем…' : editing ? 'Сохранить' : 'Добавить'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Имя">
            <Input
              value={form.firstName}
              onChange={(e) => set('firstName', e.target.value)}
              placeholder="Тимур"
            />
          </Field>
          <Field label="Фамилия">
            <Input
              value={form.lastName}
              onChange={(e) => set('lastName', e.target.value)}
              placeholder="Рахимов"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="name@global-expo.uz"
            />
          </Field>
          <Field label="Телефон" error={errors.phone}>
            <PhoneInput
              value={form.phone}
              onChange={(digits) => set('phone', digits)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Логин" required error={errors.login}>
            <Input
              value={form.login}
              onChange={(e) => set('login', e.target.value)}
              placeholder="ivanov"
              autoComplete="off"
            />
          </Field>
          <Field
            label="Пароль"
            required={!editing}
            error={errors.password}
            hint={
              editing ? 'Пусто — прежний пароль останется как есть.' : undefined
            }
          >
            <div className="relative">
              <Input
                type={passwordShown ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={editing ? '••••••' : 'Не короче 8 символов'}
                autoComplete="new-password"
                // Место под кнопку: иначе длинный пароль уезжает под неё.
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setPasswordShown((shown) => !shown)}
                aria-label={passwordShown ? 'Скрыть пароль' : 'Показать пароль'}
                title={passwordShown ? 'Скрыть пароль' : 'Показать пароль'}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-muted transition-colors hover:text-ink focus-ring"
              >
                {passwordShown ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Рекламодателя спрашиваем только у этой роли: площадка и
              наблюдатель видят всех. */}
          {form.role === 'advertiser' && (
            <Field label="Рекламодатель" required error={errors.advertiserId}>
              <Select
                value={form.advertiserId}
                onChange={(e) => set('advertiserId', e.target.value)}
              >
                <option value="">— не выбран —</option>
                {(advertisers ?? []).map((advertiser) => (
                  <option key={advertiser.id} value={advertiser.id}>
                    {advertiser.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field
            label="Статус"
            hint="Отключённый не сможет войти, но останется в списке."
          >
            <Select
              value={form.isActive ? 'active' : 'inactive'}
              onChange={(e) => set('isActive', e.target.value === 'active')}
            >
              <option value="active">Активен</option>
              <option value="inactive">Отключён</option>
            </Select>
          </Field>
        </div>
      </div>
    </Modal>
  )
}
