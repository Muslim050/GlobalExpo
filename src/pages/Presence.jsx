import { Clock, Users as UsersIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useUsers } from '@/features/users/queries'
import { useAdvertisers } from '@/features/advertisers/queries'
import { ROLE_LABELS } from '@/features/auth/user'
import { presenceOf } from '@/lib/presenceSeed.js'
import { formatDuration, formatSince } from '@/lib/format.js'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Avatar } from '@/components/ui/Avatar.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { Loader } from '@/components/ui/Loader.jsx'
import { FadeIn } from '@/components/ui/FadeIn.jsx'
import { Button } from '@/components/ui/Button'

/** Тон бейджа роли — тот же, что и в списке пользователей. */
const ROLE_TONE = {
  admin: 'indigo',
  viewer: 'muted',
  advertiser: 'success',
}

/** Зелёная точка «в сети»: пульсирует, поэтому видна в общем списке. */
function OnlineDot({ className = '' }) {
  return (
    <span className={`relative flex h-2.5 w-2.5 ${className}`}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-sm bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-sm bg-emerald-500" />
    </span>
  )
}

/** Карточка человека, который сейчас в платформе. */
function OnlineCard({ user, brand, presence }) {
  return (
    <Card hover className="p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="relative shrink-0">
          <Avatar name={user.name || user.login} size="lg" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-sm bg-emerald-500 ring-2 ring-surface" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-semibold text-ink">
            {user.name || user.login}
          </p>
          <p className="truncate text-[12px] text-ink-muted">
            {user.login}
            {brand && ` · ${brand}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge tone={ROLE_TONE[user.role]} dot>
              {ROLE_LABELS[user.role]}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <p className="flex items-center gap-2 text-[12px] text-ink-soft">
          <Clock size={14} className="shrink-0 text-ink-muted" />
          <span className="truncate">
            В сети {formatDuration(presence.onlineSince)}
          </span>
        </p>
      </div>
    </Card>
  )
}

/**
 * «Кто в сети» — вкладка рядом с рекламодателями и пользователями.
 * `tabs` — заголовок и переключатель разделов, они рисуются первыми.
 *
 * Данные о присутствии пока демонстрационные: в API их нет. Заменяется
 * одним местом — `presenceOf` в `src/lib/presenceSeed.js`.
 */
export default function Presence({ tabs = null }) {
  const { user: me } = useAuth()
  const { data, isPending, isError, error, refetch } = useUsers()
  const { data: advertisers } = useAdvertisers()

  const users = data ?? []
  const brandName = (id) =>
    (advertisers ?? []).find((advertiser) => advertiser.id === id)?.name ?? ''

  if (isPending) return <Loader label="Смотрим, кто в платформе…" />

  const presence = presenceOf(users, me?.id)
  const online = users.filter((user) => presence.get(user.id)?.online)
  // Остальных показываем по свежести захода: сверху те, кто был только что.
  const away = users
    .filter((user) => !presence.get(user.id)?.online)
    .sort(
      (a, b) =>
        new Date(presence.get(b.id).lastSeenAt) -
        new Date(presence.get(a.id).lastSeenAt),
    )

  return (
    <FadeIn>
      {tabs}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <OnlineDot />
          <p className="text-sm text-ink-soft">
            Сейчас в платформе:{' '}
            <span className="font-display text-base font-semibold text-ink tnum">
              {online.length}
            </span>{' '}
            из {users.length}
          </p>
        </div>
        {/* Про демо-данные говорим прямо: цифры ниже пока не настоящие. */}
        <p className="text-[12px] text-ink-muted">
          Демонстрационные данные — присутствие в API пока не ведётся
        </p>
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
      ) : (
        <>
          {online.length === 0 ? (
            <Card>
              <EmptyState
                icon={UsersIcon}
                title="Никого нет"
                description="Сейчас в платформе никто не работает."
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {online.map((user) => (
                <OnlineCard
                  key={user.id}
                  user={user}
                  brand={brandName(user.advertiserId)}
                  presence={presence.get(user.id)}
                />
              ))}
            </div>
          )}

          {away.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-ink-muted">
                Заходили раньше
              </h2>
              <Card className="divide-y divide-line/60">
                {away.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 px-4 py-2.5"
                  >
                    <Avatar name={user.name || user.login} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink">
                        {user.name || user.login}
                      </p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {user.login}
                        {brandName(user.advertiserId) &&
                          ` · ${brandName(user.advertiserId)}`}
                      </p>
                    </div>
                    <Badge tone={ROLE_TONE[user.role]} dot>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    <span className="w-32 shrink-0 text-right text-[12px] text-ink-muted">
                      {formatSince(presence.get(user.id).lastSeenAt)}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </>
      )}
    </FadeIn>
  )
}
