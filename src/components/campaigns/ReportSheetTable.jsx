import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FileSpreadsheet, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { isApiError } from '@/api/errors'
import { useAuth } from '@/features/auth/useAuth'
import { useSaveReportSheet } from '@/features/reports/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card.jsx'
import { formatNumber } from '@/lib/format.js'
import { cn } from '@/lib/cn.js'

/**
 * Колонки по форме листа. Таблицу выбираем по `kind`, а не по коду листа:
 * логов выходов четыре, эфиров два, соцсеть одна — форм всего три.
 * `accent` — дата и время выхода, их красим так же, как в файле.
 */
const COLUMNS = {
  spot_log: [
    { key: 'item', label: 'Item name', type: 'text' },
    { key: 'date', label: 'Date', type: 'date', accent: true },
    { key: 'time', label: 'Time', type: 'time', accent: true },
  ],
  live_event: [
    { key: 'date', label: 'Date', type: 'date', accent: true },
    { key: 'time', label: 'Time', type: 'time', accent: true },
    { key: 'tournament', label: 'Tournament', type: 'text' },
    { key: 'event', label: 'Event', type: 'text' },
  ],
  social: [
    { key: 'link', label: 'Ссылка', type: 'text' },
    { key: 'impressions', label: 'Impressions', type: 'number' },
  ],
}

/** Пустая строка для «Добавить строку» — по форме листа. */
const EMPTY_ROW = {
  spot_log: () => ({ item: '', date: '', time: '' }),
  live_event: () => ({ date: '', time: '', tournament: '', event: '' }),
  social: (network) => ({ network, link: '', impressions: 0 }),
}

// Соцсети в листе идут блоками: сначала Instagram, потом Telegram.
const NETWORK_ORDER = ['instagram', 'telegram']

const EYEBROW = {
  spot_log: 'Broadcast log',
  live_event: 'Live events',
  social: 'Social media report',
}

/**
 * ISO-дата из файла → дд.мм.гггг. Разбираем строкой, без Date: он читает
 * `2026-01-09` как полночь по UTC, и западнее Гринвича день съехал бы назад.
 */
const isoToRu = (value) => {
  const [year, month, day] = String(value).split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}

/** Значение ячейки в режиме просмотра. */
function display(column, value) {
  if (value === '' || value === null || value === undefined) return '—'
  if (column.type === 'date') return isoToRu(value)
  if (column.type === 'number') return formatNumber(value)
  return value
}

/** Число из поля: пустое — ноль, всё лишнее отбрасываем. */
const toCount = (value) => {
  const digits = String(value ?? '').replace(/[^\d]/g, '')
  return digits ? Number(digits) : 0
}

/**
 * Строка в режиме правки. Мемоизирована: в логе промо бывает под 800 строк,
 * и без этого каждая набранная буква перерисовывала бы весь лист.
 */
const EditRow = memo(function EditRow({
  row,
  index,
  columns,
  errors,
  onChange,
  onRemove,
  onInsert,
}) {
  return (
    <tr className={cn('group', index % 2 ? 'bg-paper/35' : 'bg-surface')}>
      <td className="relative px-2 py-1.5 text-center text-[11px] text-ink-muted tnum">
        {index + 1}
        {/* «+» на нижней границе строки: вставляет пустую строку под ней. */}
        <button
          type="button"
          onClick={() => onInsert(index)}
          aria-label={`Добавить строку после ${index + 1}`}
          title="Добавить строку ниже"
          className="absolute -bottom-2.5 left-1/2 z-[5] flex size-5 -translate-x-1/2 items-center justify-center rounded-sm bg-indigo-500 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:scale-110 focus-visible:opacity-100 focus-ring"
        >
          <Plus size={12} strokeWidth={3} />
        </button>
      </td>
      {columns.map((column) => {
        const error = errors?.[column.key]
        return (
          <td key={column.key} className="border-l border-line px-1.5 py-1">
            <input
              type={
                column.type === 'number'
                  ? 'text'
                  : column.type === 'text'
                    ? 'text'
                    : column.type
              }
              // Время с секундами: так оно записано в файле.
              step={column.type === 'time' ? 1 : undefined}
              inputMode={column.type === 'number' ? 'numeric' : undefined}
              value={
                column.type === 'number'
                  ? formatNumber(row[column.key])
                  : (row[column.key] ?? '')
              }
              onChange={(e) =>
                onChange(
                  index,
                  column.key,
                  column.type === 'number'
                    ? toCount(e.target.value)
                    : e.target.value,
                )
              }
              aria-invalid={!!error}
              title={error}
              className={cn(
                'w-full rounded-lg border bg-surface px-2 py-1 text-[13px] text-ink outline-hidden transition-colors tnum focus:ring-2',
                error
                  ? 'border-danger focus:border-danger focus:ring-danger/20'
                  : 'border-line focus:border-indigo-400 focus:ring-indigo-200',
              )}
            />
          </td>
        )
      })}
      <td className="w-10 px-1 text-center">
        <button
          type="button"
          onClick={() => onRemove(index)}
          aria-label={`Удалить строку ${index + 1}`}
          title="Удалить строку"
          className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-ring"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
})

/**
 * Лист отчёта за месяц: просмотр и правка. Сохраняется целиком по кнопке —
 * сервер принимает весь список строк в нужном порядке и отвечает листом с
 * новой версией.
 *
 * У соцсети лист один на обе сети, а вкладок две: `network` показывает
 * только строки своей сети, а при сохранении вторая сеть уходит нетронутой.
 */
export function ReportSheetTable({
  sheet,
  contractId,
  period,
  network,
  title,
  subtitle,
}) {
  const { canEdit, isAdvertiser } = useAuth()
  // Загружать и править отчёт может только площадка.
  const readOnly = isAdvertiser || !canEdit
  const toast = useToast()
  const { mutate: saveSheet, isPending: saving } = useSaveReportSheet()

  const columns = COLUMNS[sheet.kind]
  const isSocial = sheet.kind === 'social'

  // Строки этой вкладки: у соцсети — только своей сети.
  const rows = useMemo(
    () =>
      isSocial
        ? sheet.rows.filter((row) => row.network === network)
        : sheet.rows,
    [sheet.rows, isSocial, network],
  )

  // Черновик правки: null — лист в режиме просмотра.
  const [draft, setDraft] = useState(null)
  // Ошибки сервера по ячейкам: { [индекс строки во вкладке]: { поле: текст } }.
  const [cellErrors, setCellErrors] = useState({})
  const editing = draft !== null
  const shown = editing ? draft : rows

  // Сменили лист или месяц — незаконченную правку не тащим за собой.
  useEffect(() => {
    setDraft(null)
    setCellErrors({})
  }, [sheet.code, network, period, contractId])

  const change = useCallback((index, key, value) => {
    setDraft((current) =>
      current.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    )
    setCellErrors((current) => {
      if (!current[index]?.[key]) return current
      const next = { ...current, [index]: { ...current[index] } }
      delete next[index][key]
      return next
    })
  }, [])

  const remove = useCallback((index) => {
    setDraft((current) => current.filter((_, i) => i !== index))
    // Ошибки привязаны к индексам — после удаления строки они съезжают.
    setCellErrors({})
  }, [])

  const insertAfter = useCallback(
    (index) => {
      setDraft((current) => [
        ...current.slice(0, index + 1),
        EMPTY_ROW[sheet.kind](network),
        ...current.slice(index + 1),
      ])
      // Индексы ниже вставки съехали — ошибки к ним уже не относятся.
      setCellErrors({})
    },
    [sheet.kind, network],
  )

  const startEditing = () => {
    setDraft(rows.map((row) => ({ ...row })))
    setCellErrors({})
  }

  const cancel = () => {
    setDraft(null)
    setCellErrors({})
  }

  const addRow = () =>
    setDraft((current) => [...current, EMPTY_ROW[sheet.kind](network)])

  /**
   * Весь лист в порядке файла. У соцсети сети идут блоками — правленая
   * встаёт на своё место, вторая остаётся как была. Смещение нужно, чтобы
   * разобрать ошибки сервера: он отвечает индексами всего листа.
   */
  const buildRows = (edited) => {
    if (!isSocial) return { all: edited, offset: 0 }
    let offset = 0
    const all = []
    for (const name of NETWORK_ORDER) {
      if (name === network) {
        offset = all.length
        all.push(...edited)
      } else {
        all.push(...sheet.rows.filter((row) => row.network === name))
      }
    }
    return { all, offset }
  }

  /** `rows[12].date` → { 12 - смещение: { date: текст } }. */
  const errorsByCell = (fields, offset) => {
    const result = {}
    for (const [path, message] of Object.entries(fields)) {
      const match = path.match(/^rows\[(\d+)\]\.(\w+)$/)
      if (!match) continue
      const index = Number(match[1]) - offset
      if (index < 0) continue
      result[index] = { ...result[index], [match[2]]: message }
    }
    return result
  }

  const save = () => {
    const { all, offset } = buildRows(draft)
    saveSheet(
      {
        contractId,
        period,
        code: sheet.code,
        input: { version: sheet.version, rows: all },
      },
      {
        onSuccess: () => {
          setDraft(null)
          setCellErrors({})
          toast.success(`${title}: лист сохранён`)
        },
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            // Лист успели изменить: отчёт уже перечитывается, правку
            // закрываем — поверх чужих данных её сохранять нельзя.
            setDraft(null)
            toast.error('Данные изменились, обновите страницу')
            return
          }
          if (isApiError(error) && Object.keys(error.fields).length) {
            setCellErrors(errorsByCell(error.fields, offset))
          }
          toast.error(error.message || 'Не удалось сохранить лист')
        },
      },
    )
  }

  const errorCount = Object.values(cellErrors).reduce(
    (sum, row) => sum + Object.keys(row ?? {}).length,
    0,
  )
  // Показы соцсети — сумма по строкам, как её считает и сервер.
  const impressions = isSocial
    ? shown.reduce((sum, row) => sum + (Number(row.impressions) || 0), 0)
    : 0

  return (
    <Card className="relative overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-800">
            {EYEBROW[sheet.kind]}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink">
            {title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>
        </div>

        {!readOnly && (
          <div className="flex flex-wrap items-center gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="secondary" onClick={addRow}>
                  <Plus size={15} />
                  Добавить строку
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancel}
                  disabled={saving}
                >
                  <X size={15} />
                  Отмена
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  <Save size={15} />
                  {saving ? 'Сохраняем…' : 'Сохранить'}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="secondary" onClick={startEditing}>
                <Pencil size={15} />
                Редактировать
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Сводка соцсети: публикации — это строки, показы — их сумма. */}
      {isSocial && (
        <div className="grid grid-cols-2 gap-3 border-b border-line p-4 sm:max-w-md">
          <div className="rounded-2xl border border-line bg-paper/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Публикации
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-ink tnum">
              {formatNumber(shown.length)}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-paper/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Impressions
            </p>
            <p className="mt-1 font-display text-xl font-semibold text-ink tnum">
              {formatNumber(impressions)}
            </p>
          </div>
        </div>
      )}

      {errorCount > 0 && (
        <p className="border-b border-danger/20 bg-danger/5 px-5 py-2.5 text-[13px] text-danger">
          Проверьте подсвеченные ячейки: ошибок — {errorCount}. Подсказка — при
          наведении на ячейку.
        </p>
      )}

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-forest font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white/85">
              <th className="w-12 px-2 py-3 text-center">№</th>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'border-l border-white/10 px-3 py-3',
                    column.accent
                      ? 'w-[130px] bg-indigo-500 text-center text-white'
                      : column.type === 'number'
                        ? 'w-[160px] text-right'
                        : 'text-left',
                  )}
                >
                  {column.label}
                </th>
              ))}
              {editing && <th className="w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {!shown.length && (
              <tr>
                <td
                  colSpan={columns.length + (editing ? 2 : 1)}
                  className="px-4 py-12 text-center"
                >
                  <FileSpreadsheet
                    size={26}
                    className="mx-auto text-ink-muted"
                  />
                  <p className="mt-3 text-sm font-medium text-ink-soft">
                    Строк нет
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {editing
                      ? 'Добавьте строку или отмените правку.'
                      : 'В загруженном файле этот лист пустой.'}
                  </p>
                </td>
              </tr>
            )}
            {editing
              ? shown.map((row, index) => (
                  <EditRow
                    key={index}
                    row={row}
                    index={index}
                    columns={columns}
                    errors={cellErrors[index]}
                    onChange={change}
                    onRemove={remove}
                    onInsert={insertAfter}
                  />
                ))
              : shown.map((row, index) => (
                  <tr
                    key={index}
                    className={cn(
                      'transition-colors hover:bg-paper/70',
                      index % 2 ? 'bg-paper/35' : 'bg-surface',
                    )}
                  >
                    <td className="px-2 py-2 text-center text-[11px] text-ink-muted tnum">
                      {index + 1}
                    </td>
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'border-l border-line px-3 py-2 text-[13px] text-ink',
                          column.accent && 'text-center tnum',
                          column.type === 'number' && 'text-right tnum',
                          column.key === 'link' && 'max-w-0 truncate',
                        )}
                        title={column.key === 'link' ? row.link : undefined}
                      >
                        {column.key === 'link' && row.link ? (
                          <a
                            href={row.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-900 underline-offset-2 hover:underline"
                          >
                            {row.link}
                          </a>
                        ) : (
                          display(column, row[column.key])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-paper/40 px-5 py-2.5 text-[12px] text-ink-muted">
        <span className="tnum">Строк: {formatNumber(shown.length)}</span>
        {editing && (
          <span>
            Изменения сохранятся для всего листа по кнопке «Сохранить»
          </span>
        )}
      </div>
    </Card>
  )
}
