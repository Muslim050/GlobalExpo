import { useState } from 'react'
import { Images } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import { useSaveStandReport } from '@/features/campaigns/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { useConfirm } from '@/components/ui/Confirm.jsx'
import { MediaDropzone, MediaSlider } from '@/components/ui/MediaSlider.jsx'

/** Что принимает поле отчёта — то же, что пропускает сервер. */
const REPORT_ACCEPT = 'image/*,video/*,.heic,.mkv,.pdf,.zip,.rar,.7z'

/**
 * Фото и видео отчёт по завершённому стенду (см. FINISHED_STATUSES).
 * Площадка бросает в поле сразу несколько файлов; загруженные листаются
 * слайдером с лентой миниатюр. Экспонент и наблюдатель смотрят и скачивают.
 *
 * `onSaved` получает стенд из ответа сервера: карточка держит снимок.
 */
export function StandReportPanel({ campaign, onSaved }) {
  const { isAdvertiser, canEdit } = useAuth()
  const { mutateAsync: saveReport } = useSaveStandReport()
  const toast = useToast()
  const confirm = useConfirm()
  const [index, setIndex] = useState(0)

  const isManager = canEdit && !isAdvertiser
  const files = campaign.standReport ?? []

  /** Загруженные файлы дописываем к отчёту и сразу показываем первый. */
  const addFiles = async (added) => {
    const saved = await saveReport({
      id: campaign.id,
      standReportIds: [...files, ...added].map((f) => f.id),
    })
    onSaved(saved)
    setIndex(files.length)
    toast.success(
      added.length === 1
        ? 'Файл добавлен в отчёт'
        : `Добавлено файлов: ${added.length}`,
    )
  }

  const remove = async (file) => {
    const ok = await confirm({
      title: 'Убрать файл из отчёта?',
      description: file.name,
    })
    if (!ok) return
    try {
      const saved = await saveReport({
        id: campaign.id,
        standReportIds: files.filter((f) => f.id !== file.id).map((f) => f.id),
      })
      onSaved(saved)
      setIndex((i) => Math.max(0, i - 1))
      toast.info('Файл убран из отчёта')
    } catch (err) {
      toast.error(err.message || 'Не удалось убрать файл')
    }
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-paper/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          Фото и видео отчёт
          {files.length > 0 && (
            <span className="ml-1.5 tnum text-ink-soft">· {files.length}</span>
          )}
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900">
          <Images size={16} />
        </span>
      </div>

      {files.length > 0 ? (
        <MediaSlider
          className="mt-3"
          label="Фото и видео отчёт"
          files={files}
          index={index}
          onIndex={setIndex}
          onRemove={isManager ? remove : undefined}
        />
      ) : (
        !isManager && (
          <p className="mt-3 text-[13px] text-ink-muted">
            Площадка ещё не загрузила отчёт.
          </p>
        )
      )}

      {/* Площадка добавляет файлы — бросает пачкой или выбирает в диалоге. */}
      {isManager && (
        <MediaDropzone
          className="mt-3"
          kind="stand_report"
          accept={REPORT_ACCEPT}
          onUploaded={addFiles}
          label={
            files.length
              ? 'Перетащите ещё фото и видео или выберите'
              : 'Перетащите фото и видео сюда или выберите'
          }
        />
      )}
      {isManager && !files.length && (
        <p className="mt-2 text-[11px] text-ink-muted">
          Можно сразу несколько файлов: фото, видео, PDF или архив.
        </p>
      )}
    </div>
  )
}
