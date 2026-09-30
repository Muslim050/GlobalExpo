import { useState } from 'react'
import { Plus, Search, Pencil, Trash2, Radio } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useData } from '@/context/DataContext.jsx'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { CH_STATUS } from '@/lib/metrics.js'
import { formatCompact, formatMoney } from '@/lib/format.js'
import { PageHeader } from '@/components/PageHeader.jsx'
import { Card } from '@/components/ui/Card.jsx'
import { Badge } from '@/components/ui/Badge.jsx'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress.jsx'
import { EmptyState } from '@/components/ui/EmptyState.jsx'
import { DropdownMenu } from '@/components/ui/DropdownMenu.jsx'
import { ChannelForm } from '@/components/forms/ChannelForm.jsx'

export default function Channels() {
  const { canEdit } = useAuth()
  const { channels, campaigns, remove } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const [q, setQ] = useState('')
  const [modal, setModal] = useState({ open: false, initial: null })

  const filtered = channels.filter((c) =>
    `${c.name} ${c.type} ${c.format}`
      .toLowerCase()
      .includes(q.trim().toLowerCase()),
  )

  const usage = (id) =>
    campaigns.filter((c) => c.channelIds.includes(id)).length

  const del = async (c) => {
    const ok = await confirm({
      title: 'Удалить площадку?',
      description: c.name,
      body: 'Площадка будет удалена из списка инвентаря.',
    })
    if (ok) {
      remove('channels', c.id)
      toast.info('Площадка удалена')
    }
  }

  return (
    <div>
      <PageHeader
        title="Площадки"
        subtitle="Инвентарь для размещения — каналы, форматы и охваты."
      >
        {canEdit && (
          <Button
            variant="primary"
            onClick={() => setModal({ open: true, initial: null })}
          >
            <Plus size={18} />
            Добавить площадку
          </Button>
        )}
      </PageHeader>

      <div className="relative mb-4 w-full sm:max-w-xs">
        <Search
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск площадки…"
          className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3.5 text-sm text-ink placeholder:text-ink-muted focus-ring focus-visible:border-indigo-300"
        />
      </div>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Площадок нет"
            description="Список инвентаря пуст."
          />
        ) : (
          <>
            <div className="hidden items-center gap-4 border-b border-line px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted md:flex">
              <span className="flex-1">Площадка</span>
              <span className="hidden w-28 lg:block">Формат</span>
              <span className="w-28 text-right">Охват</span>
              <span className="hidden w-20 text-right sm:block">CPM</span>
              <span className="hidden w-40 md:block">Заполняемость</span>
              <span className="w-24">Статус</span>
              {canEdit && <span className="w-9" />}
            </div>

            <div className="divide-y divide-line">
              {filtered.map((c) => {
                const st = CH_STATUS[c.status]
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-ink/1.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{ background: c.color }}
                      >
                        <Radio size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {c.name}
                        </p>
                        <p className="text-[12px] text-ink-muted">
                          {c.type} · {usage(c.id)} кампаний
                        </p>
                      </div>
                    </div>

                    <span className="hidden w-28 text-sm text-ink-soft lg:block">
                      {c.format}
                    </span>
                    <span className="w-28 text-right text-sm text-ink-soft tnum">
                      {formatCompact(c.reach)}
                    </span>
                    <span className="hidden w-20 text-right text-sm text-ink-soft tnum sm:block">
                      {formatMoney(c.cpm)}
                    </span>
                    <div className="hidden w-40 md:block">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={c.fillRate}
                          tone={c.fillRate > 90 ? 'success' : 'indigo'}
                        />
                        <span className="w-9 text-right text-[12px] text-ink-muted tnum">
                          {c.fillRate}%
                        </span>
                      </div>
                    </div>
                    <div className="w-24">
                      <Badge tone={st.tone} dot>
                        {st.label}
                      </Badge>
                    </div>

                    {canEdit && (
                      <DropdownMenu
                        items={[
                          {
                            label: 'Изменить',
                            icon: Pencil,
                            onClick: () => setModal({ open: true, initial: c }),
                          },
                          {
                            label: 'Удалить',
                            icon: Trash2,
                            tone: 'danger',
                            onClick: () => del(c),
                          },
                        ]}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      <ChannelForm
        open={modal.open}
        initial={modal.initial}
        onClose={() => setModal({ open: false, initial: null })}
      />
    </div>
  )
}
