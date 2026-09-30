import { useEffect, useRef, useState } from 'react'
import {
  Check,
  Download,
  FileSpreadsheet,
  Save,
  Trash2,
  Upload,
} from 'lucide-react'
import { cn } from '@/lib/cn.js'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card.jsx'
import { useAuth } from '@/features/auth/useAuth'
import { useToast } from '@/components/ui/Toast.jsx'

const STORAGE_KEY = 'globalexpo.campaign.spot-logs.v1'
const HEADER_CELLS = ['item name', 'date', 'time']

/**
 * Лог из браузера. Таблица осталась только у категории OTT: логи выходов и
 * промо приходят листами из файла отчёта (ReportSheetTable).
 */
function loadRows(logKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return Array.isArray(saved[logKey]) ? saved[logKey] : []
  } catch {
    return []
  }
}

function persistRows(logKey, rows) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...saved, [logKey]: rows }),
    )
  } catch {
    // Переполнение хранилища не должно ронять импорт — данные останутся в сессии.
  }
}

const pad = (n) => String(n).padStart(2, '0')

/** Excel хранит время долей суток (0.5 → 12:00), а даты — днями от 30.12.1899. */
function excelTime(value) {
  const total = Math.round(Number(value) * 24 * 60 * 60)
  const seconds = ((total % 86400) + 86400) % 86400
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`
}

function excelDate(value) {
  const date = new Date(Date.UTC(1899, 11, 30) + Number(value) * 86400000)
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`
}

const isNumeric = (value) => value !== '' && !Number.isNaN(Number(value))

/** Строки лога из листа: пропускаем шапку файла и приводим дату со временем. */
export function rowsFromSheet(sheet) {
  const headerIndex = sheet.findIndex((row) =>
    HEADER_CELLS.every((cell) =>
      row.some((value) => String(value).trim().toLowerCase() === cell),
    ),
  )

  return sheet
    .slice(headerIndex + 1)
    .map((row) => {
      const [item = '', date = '', time = ''] = row
      return {
        item: String(item).trim(),
        // Дата-число — это порядковый номер дня, всё остальное берём как есть.
        date:
          isNumeric(date) && Number(date) > 1000
            ? excelDate(date)
            : String(date).trim(),
        // Время-число — доля суток; текстовое «19:09:13» не трогаем.
        time: isNumeric(time) ? excelTime(time) : String(time).trim(),
      }
    })
    .filter((row) => row.item || row.date || row.time)
}

export function SpotLogTable({ logKey, sheetName, title, subtitle }) {
  const { isAdvertiser, isViewer, canEdit } = useAuth()
  // Рекламодателю и наблюдателю таблица доступна только на просмотр.
  const readOnly = isAdvertiser || !canEdit
  const toast = useToast()
  const [rows, setRows] = useState(() => loadRows(logKey))
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const fileInputRef = useRef(null)

  // При переходе между вкладками показываем лог выбранной.
  useEffect(() => {
    setRows(loadRows(logKey))
    setIsDirty(false)
    setJustSaved(false)
  }, [logKey])

  // Импорт и очистка меняют таблицу, но на диск кладём только по «Сохранить».
  const apply = (nextRows) => {
    setRows(nextRows)
    setIsDirty(true)
    setJustSaved(false)
  }

  const save = () => {
    persistRows(logKey, rows)
    setIsDirty(false)
    setJustSaved(true)
    window.setTimeout(() => setJustSaved(false), 1800)
    toast.success('Таблица сохранена')
  }

  const download = async () => {
    const { buildXlsx, downloadBlob } = await import('@/lib/xlsx.js')
    const blob = buildXlsx({
      sheetName,
      rows: [
        ['ITEM NAME', 'DATE', 'TIME'],
        ...rows.map((row) => [row.item, row.date, row.time]),
      ],
    })
    downloadBlob(blob, `${title}.xlsx`)
  }

  const importFile = async (file) => {
    if (!file) return
    if (!/\.xlsx$/i.test(file.name)) {
      toast.error('Нужен файл .xlsx')
      return
    }
    setIsImporting(true)
    try {
      // Парсер тянем только когда он реально нужен.
      const { readSheets, findSheet } = await import('@/lib/xlsx.js')
      const sheets = await readSheets(file)
      // Из книги берём лист этой вкладки, а если его нет — первый.
      const sheet = findSheet(sheets, sheetName) || sheets[0]
      const imported = rowsFromSheet(sheet.rows)
      if (!imported.length) {
        toast.error(`На листе «${sheet.name}» нет строк с данными`)
        return
      }
      apply(imported)
      toast.success(`«${sheet.name}» — загружено строк: ${imported.length}`)
    } catch {
      toast.error('Не удалось прочитать файл')
    } finally {
      setIsImporting(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (readOnly) return
    importFile(e.dataTransfer.files?.[0])
  }

  return (
    <Card
      className="relative overflow-hidden"
      onDragOver={(e) => {
        if (readOnly) return
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
      }}
      onDrop={onDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          importFile(file)
        }}
      />
      {isDragging && !readOnly && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50/85 backdrop-blur-[1px]">
          <p className="flex items-center gap-2 text-sm font-medium text-indigo-900">
            <FileSpreadsheet size={18} />
            Отпустите файл — возьмём лист «{sheetName}»
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 border-b border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-800">
            Broadcast log
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold text-ink">
            {title}
          </h3>
          <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p>
        </div>
        {/* Наблюдателю оставляем только выгрузку — она ничего не меняет. */}
        <div className="flex flex-wrap items-center gap-2">
          {!readOnly && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload size={15} />
              {isImporting ? 'Загружаем…' : 'Импорт Excel'}
            </Button>
          )}
          {(!readOnly || isViewer) && (
            <Button
              size="sm"
              variant="secondary"
              onClick={download}
              disabled={!rows.length}
            >
              <Download size={15} />
              Скачать
            </Button>
          )}
          {!readOnly && (
            <>
              <Button size="sm" onClick={save} disabled={!isDirty}>
                {justSaved ? <Check size={15} /> : <Save size={15} />}
                {justSaved ? 'Сохранено' : 'Сохранить'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => apply([])}
                disabled={!rows.length}
              >
                <Trash2 size={15} />
                Очистить
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-h-[560px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-forest font-mono text-[10.5px] font-semibold uppercase tracking-wider text-white/85">
              <th className="w-12 px-2 py-3 text-center">№</th>
              <th className="border-l border-white/10 px-3 py-3 text-left">
                Item name
              </th>
              {/* Дата и время выхода — своя красная колонка, как в медиаплане. */}
              <th className="w-[120px] border-l border-white/10 bg-indigo-500 px-3 py-3 text-center text-white">
                Date
              </th>
              <th className="w-[110px] border-l border-white/10 bg-indigo-500 px-3 py-3 text-center text-white">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {!rows.length && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center">
                  <FileSpreadsheet
                    size={26}
                    className="mx-auto text-ink-muted"
                  />
                  <p className="mt-3 text-sm font-medium text-ink-soft">
                    Таблица пустая
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    {readOnly
                      ? 'Данные появятся после загрузки отчёта.'
                      : `Перетащите сюда .xlsx — возьмём из него лист «${sheetName}».`}
                  </p>
                </td>
              </tr>
            )}
            {rows.map((row, index) => (
              <tr
                key={`${row.item}-${row.date}-${row.time}-${index}`}
                className={cn(
                  'transition-colors hover:bg-paper/70',
                  index % 2 ? 'bg-paper/35' : 'bg-surface',
                )}
              >
                <td className="px-2 py-2 text-center text-[11px] text-ink-muted tnum">
                  {index + 1}
                </td>
                <td className="border-l border-line px-3 py-2 text-ink-soft">
                  {row.item}
                </td>
                <td className="border-l border-line bg-danger/4.5 px-3 py-2 text-center font-semibold text-ink tnum">
                  {row.date}
                </td>
                <td className="border-l border-line bg-danger/4.5 px-3 py-2 text-center font-semibold text-ink tnum">
                  {row.time}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(rows.length > 0 || isDirty) && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-paper/70 px-5 py-3 text-[12px] font-semibold text-ink">
          <span>
            Всего выходов
            {isDirty && (
              <span className="ml-2 font-medium text-ink-muted">
                · есть несохранённые изменения
              </span>
            )}
          </span>
          <span className="tnum">{rows.length}</span>
        </div>
      )}
    </Card>
  )
}

// Выгрузка всей статистики читает лог теми же правилами, что таблица.
