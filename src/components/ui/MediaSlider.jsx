import { useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Play,
  Trash2,
  Upload,
} from 'lucide-react'
import { useUploadMany } from '@/features/files/useUploadMany'
import { downloadFile, fileHref } from '@/features/files/download'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn.js'
import { formatDateTime } from '@/lib/format.js'

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif']
const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'm4v']

/**
 * Как показать файл в слайдере: фото, ролик или карточка для скачивания
 * (PDF, архив, HEIC — браузер их не нарисует). Тип узнаём по имени, а у
 * файлов из data:-ссылок — по самой ссылке.
 */
function mediaKind(file) {
  const url = file.url ?? ''
  if (url.startsWith('data:image/')) return 'image'
  if (url.startsWith('data:video/')) return 'video'
  const ext = (/\.([^.]+)$/.exec(file.name || url)?.[1] ?? '').toLowerCase()
  if (IMAGE_EXTS.includes(ext)) return 'image'
  if (VIDEO_EXTS.includes(ext)) return 'video'
  return 'file'
}

/** Текущий слайд во весь кадр. */
function Slide({ file }) {
  const kind = mediaKind(file)
  const href = fileHref(file.url)

  if (kind === 'image') {
    return (
      <img
        src={href}
        alt={file.name}
        className="h-full w-full object-contain"
        draggable={false}
      />
    )
  }
  if (kind === 'video') {
    // key — чтобы при переключении слайдов ролик начинался заново.
    return (
      <video
        key={href}
        src={href}
        controls
        preload="metadata"
        className="h-full w-full object-contain"
      />
    )
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-white/80">
      <FileText size={36} className="text-white/60" />
      <p className="max-w-full truncate text-sm font-medium">{file.name}</p>
      <Button size="sm" variant="secondary" onClick={() => downloadFile(file)}>
        <Download size={14} />
        Скачать файл
      </Button>
    </div>
  )
}

/** Миниатюра в ленте под слайдом. */
function Thumb({ file, active, onClick, index }) {
  const kind = mediaKind(file)
  return (
    <button
      type="button"
      onClick={onClick}
      title={file.name}
      aria-label={`Слайд ${index + 1}: ${file.name}`}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'relative h-12 w-[72px] shrink-0 overflow-hidden rounded-lg border-2 bg-forest transition-opacity focus-ring',
        active
          ? 'border-indigo-500'
          : 'border-transparent opacity-60 hover:opacity-100',
      )}
    >
      {kind === 'image' ? (
        <img
          src={fileHref(file.url)}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-white/80">
          {kind === 'video' ? <Play size={16} /> : <FileText size={16} />}
        </span>
      )}
    </button>
  )
}

/**
 * Слайдер фото и видео: кадр со стрелками и счётчиком, подпись с кнопкой
 * «Скачать» и лента миниатюр. Листается и стрелками клавиатуры.
 *
 * files: [{ id, name, url, addedAt }]. `index` и `onIndex` — номер слайда:
 * его держит родитель, чтобы после загрузки сразу показать новый файл.
 * `onRemove(file)` — если передан, рядом со «Скачать» появляется корзина.
 */
export function MediaSlider({
  files,
  index,
  onIndex,
  onRemove,
  label = 'Фото и видео',
  showCaption = true,
  className,
}) {
  // Файлов могло стать меньше (убрали последний) — не выходим за край.
  const position = Math.max(0, Math.min(index, files.length - 1))
  const current = files[position]
  if (!current) return null

  const go = (step) => onIndex((position + step + files.length) % files.length)

  return (
    <div className={className}>
      <div
        tabIndex={0}
        onKeyDown={(e) => {
          if (files.length < 2) return
          if (e.key === 'ArrowLeft') go(-1)
          if (e.key === 'ArrowRight') go(1)
        }}
        className="relative aspect-video overflow-hidden rounded-xl bg-forest focus-ring"
        aria-roledescription="слайдер"
        aria-label={label}
      >
        <Slide file={current} />
        <span className="pointer-events-none absolute top-2 right-2 rounded-md bg-forest/70 px-2 py-0.5 font-mono text-[11px] text-white tnum">
          {position + 1} / {files.length}
        </span>
        {files.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Предыдущий слайд"
              className="absolute top-1/2 left-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-forest/60 text-white transition-colors hover:bg-forest/85 focus-ring"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Следующий слайд"
              className="absolute top-1/2 right-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-forest/60 text-white transition-colors hover:bg-forest/85 focus-ring"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {(showCaption || onRemove) && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[12px] text-ink-muted">
            {showCaption && (
              <>
                <span className="font-medium text-ink-soft">
                  {current.name}
                </span>
                {current.addedAt && (
                  <span className="tnum">
                    {' '}
                    · {formatDateTime(current.addedAt)}
                  </span>
                )}
              </>
            )}
          </p>
          <div className="flex shrink-0 gap-1.5">
            {showCaption && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => downloadFile(current)}
                title="Скачать файл"
              >
                <Download size={14} />
                Скачать
              </Button>
            )}
            {onRemove && (
              <Button
                size="sm"
                variant="secondary"
                className="w-9 px-0"
                onClick={() => onRemove(current)}
                title="Убрать"
                aria-label={`Убрать «${current.name}»`}
              >
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      )}

      {files.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {files.map((file, i) => (
            <Thumb
              key={file.id}
              file={file}
              index={i}
              active={i === position}
              onClick={() => onIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Поле для пачки файлов: бросить несколько разом или выбрать в диалоге.
 * Файлы уходят на сервер по одному (`POST /files` с `kind`), затем
 * `onUploaded(files)` получает их как `{ id, name, url, addedAt }` —
 * родитель дописывает их к сущности.
 */
export function MediaDropzone({
  kind,
  accept,
  onUploaded,
  label = 'Перетащите файлы сюда или выберите',
  className,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const { addFiles, progress } = useUploadMany(kind, onUploaded)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(e.dataTransfer.files)
      }}
      className={cn(
        'rounded-xl border border-dashed border-line bg-surface transition-colors',
        dragging && 'border-solid border-indigo-400 bg-indigo-50',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          // Сбрасываем, иначе повторный выбор тех же файлов не сработает.
          e.target.value = ''
        }}
      />
      <button
        type="button"
        disabled={!!progress}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 px-4 py-4 text-[13px] text-ink-soft focus-ring disabled:opacity-70"
      >
        {progress ? (
          <>
            <Loader2 size={16} className="animate-spin text-ink-muted" />
            Загружаем {progress.done + 1} из {progress.total}…
          </>
        ) : (
          <>
            <Upload size={16} className="text-ink-muted" />
            {label}
          </>
        )}
      </button>
    </div>
  )
}
