import { useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Plus, Search, Trash2, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useUsers, useDeleteUser } from '@/features/users/queries'
import { useAdvertisers } from '@/features/advertisers/queries'
import { ROLE_LABELS } from '@/features/auth/user'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { formatDateNumeric } from '@/lib/format.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { FadeIn } from '@/components/ui/FadeIn.jsx'
import { UserForm } from '@/components/forms/UserForm.jsx'

/** Тон бейджа роли: у площадки права шире, чем у наблюдателя. */
const ROLE_TONE = {
  admin: 'indigo',
  viewer: 'muted',
  advertiser: 'success',
}

/**
 * Список пользователей платформы. Живёт вкладкой внутри «Рекламодателей»:
 * `tabs` — заголовок и переключатель разделов, они рисуются первыми.
 */
export default function Users({ tabs = null }) {
  const { user: me } = useAuth()
  const { data, isPending, isError, error, refetch } = useUsers()
  // Рекламодатели нужны затем, чтобы показать, чей раздел видит человек.
  const { data: advertisers } = useAdvertisers()
  const { mutate: deleteUser } = useDeleteUser()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState({ open: false, initial: null })

  const users = data ?? []
  const brandName = (id) =>
    (advertisers ?? []).find((advertiser) => advertiser.id === id)?.name ?? ''

  // Роль видно в самой таблице, отдельным фильтром её больше не режем:
  // пользователей немного, и поиска по логину хватает.
  const query = q.trim().toLowerCase()
  const filtered = users.filter((u) =>
    `${u.login} ${u.name} ${u.email} ${u.phone} ${brandName(u.advertiserId)}`
      .toLowerCase()
      .includes(query),
  )

  const del = async (u) => {
    const ok = await confirm({
      title: 'Удалить пользователя?',
      description: u.name ? `${u.name} · ${u.login}` : u.login,
      body: 'Человек потеряет доступ к платформе. Действие нельзя отменить.',
    })
    if (!ok) return

    deleteUser(u.id, {
      onSuccess: () => toast.info('Пользователь удалён'),
      onError: (err2) =>
        toast.error(err2.message || 'Не удалось удалить пользователя'),
    })
  }

  // Пока список не пришёл, на экране только ожидание.
  if (isPending) return <Loader label="Загружаем пользователей…" />

  return (
    <FadeIn>
      {tabs}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Поиск пользователя"
            placeholder="Поиск по логину или имени…"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted focus-ring focus-visible:border-indigo-300"
          />
        </div>
        <Button
          variant="primary"
          className="shrink-0"
          onClick={() => setModal({ open: true, initial: null })}
        >
          <Plus size={18} />
          Новый пользователь
        </Button>
      </div>

      {isError ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title="Не удалось загрузить пользователей"
            description={error?.message ?? 'Попробуйте ещё раз.'}
            action={
              <Button variant="secondary" onClick={() => refetch()}>
                Повторить
              </Button>
            }
          />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={UsersIcon}
            title={users.length ? 'Ничего не нашлось' : 'Пользователей нет'}
            description={
              users.length
                ? 'Попробуйте изменить запрос.'
                : 'Заведите первого — он получит доступ к платформе.'
            }
            action={
              <Button
                variant="secondary"
                onClick={() => setModal({ open: true, initial: null })}
              >
                <Plus size={16} />
                Добавить
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                <Th className="w-10">№</Th>
                <Th>Пользователь</Th>
                <Th>Контакты</Th>
                <Th>Роль</Th>
                <Th>Экспонент</Th>
                <Th>Доступ</Th>
                <Th>Создан</Th>
                <Th className="text-center">Действия</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.3 }}
                  className="border-b border-line/20 transition-colors last:border-0 hover:bg-paper"
                >
                  <Td className="w-10 text-[12px] text-ink-muted tnum">
                    {i + 1}
                  </Td>
                  <Td>
                    <span className="flex items-center gap-2">
                      <Avatar name={u.name || u.login} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {u.name || u.login}
                        </span>
                        <span className="block truncate text-[11px] text-ink-muted">
                          {u.login}
                          {/* Себя видно сразу: свою учётку легко испортить. */}
                          {u.id === me?.id && ' · это вы'}
                        </span>
                      </span>
                    </span>
                  </Td>
                  {/* Почта и телефон — одной колонкой: их читают вместе,
                      а отдельный столбец увёл бы таблицу в прокрутку. */}
                  <Td className="text-ink-soft">
                    {u.email || u.phone ? (
                      <span className="min-w-0">
                        {u.email && (
                          <span className="block truncate">{u.email}</span>
                        )}
                        {u.phone && (
                          <span className="block truncate text-[11px] text-ink-muted tnum">
                            {u.phone}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-ink-muted">—</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONE[u.role]} dot>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </Td>
                  <Td className="text-ink-soft">
                    {brandName(u.advertiserId) || (
                      <span className="text-ink-muted">—</span>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={u.isActive ? 'success' : 'muted'} dot>
                      {u.isActive ? 'Активен' : 'Отключён'}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-[12px] text-ink-muted tnum">
                    {formatDateNumeric(u.createdAt)}
                  </Td>
                  <Td>
                    <span className="flex justify-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-9 w-9 shrink-0 px-0"
                        onClick={() => setModal({ open: true, initial: u })}
                        aria-label={`Редактировать ${u.login}`}
                        title="Редактировать"
                      >
                        <Pencil size={16} />
                      </Button>
                      {/* Себя не удаляем: остаться без админа некому помочь. */}
                      {u.id !== me?.id && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="h-9 w-9 shrink-0 px-0"
                          onClick={() => del(u)}
                          aria-label={`Удалить ${u.login}`}
                          title="Удалить"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </span>
                  </Td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <UserForm
        open={modal.open}
        initial={modal.initial}
        onClose={() => setModal({ open: false, initial: null })}
      />
    </FadeIn>
  )
}

function Th({ children, className }) {
  return (
    <th className={`px-4 py-3 font-semibold ${className ?? ''}`}>{children}</th>
  )
}

function Td({ children, className }) {
  return (
    <td className={`px-4 py-3 align-middle ${className ?? ''}`}>{children}</td>
  )
}
