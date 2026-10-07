import { useState } from 'react'
import { Box, Check, RotateCcw, Send } from 'lucide-react'
import { useAuth } from '@/features/auth/useAuth'
import {
  useProjectReview,
  useSaveCampaignProject,
} from '@/features/campaigns/queries'
import { useToast } from '@/components/ui/Toast.jsx'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { FilePicker } from '@/components/ui/FilePicker.jsx'
import { formatDateTime } from '@/lib/format.js'

/** Что принимает поле 3D проекта — то же, что пропускает сервер. */
const PROJECT_ACCEPT =
  '.skp,.3ds,.max,.obj,.fbx,.stl,.glb,.gltf,.blend,.c4d,.dwg,.dxf,.pdf,.png,.jpg,.jpeg,.zip,.rar,.7z'

/** Шаги журнала согласования — как их читает человек. */
const LOG_LABELS = {
  sent: 'отправил(а) проект на согласование',
  approved: 'подтвердил(а) проект',
  rework: 'вернул(а) проект на доработку',
}

/**
 * 3D проект стенда и его согласование. Площадка загружает проект и
 * отправляет экспоненту — стенд получает статус «Проект на согласовании».
 * Экспонент подтверждает его или возвращает на доработку с замечанием;
 * площадка правит файл и отправляет снова. Наблюдатель только смотрит.
 *
 * Карточка рендерит панель с `key` стенда: открыли другой — недописанное
 * замечание не переносится.
 *
 * `onSaved` получает стенд из ответа сервера: карточка держит снимок, и без
 * этого статус в ней обновился бы только после повторного открытия.
 */
export function ProjectPanel({ campaign, onSaved }) {
  const { isAdvertiser, canEdit } = useAuth()
  const { mutate: saveProject } = useSaveCampaignProject()
  const { mutate: review, isPending } = useProjectReview()
  const toast = useToast()
  // Экспонент пишет замечание — поле раскрывается по кнопке «На доработку».
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')

  const isManager = canEdit && !isAdvertiser
  const project = campaign.project
  const status = campaign.status
  const awaitingReply = status === 'project_sent'
  const log = campaign.projectLog ?? []

  const done = (message) => (saved) => {
    onSaved(saved)
    toast.success(message)
  }
  const failed = (fallback) => (err) => toast.error(err.message || fallback)

  /** Бросили или выбрали файл (null — убрали): сразу пишем его в стенд. */
  const pickProject = (file) =>
    saveProject(
      { id: campaign.id, projectId: file?.id ?? null },
      {
        onSuccess: done(file ? '3D проект загружен' : '3D проект удалён'),
        onError: failed('Не удалось сохранить 3D проект'),
      },
    )

  const send = () =>
    review(
      { id: campaign.id, action: 'send' },
      {
        onSuccess: done('Проект отправлен экспоненту на согласование'),
        onError: failed('Не удалось отправить проект'),
      },
    )

  const approve = () =>
    review(
      { id: campaign.id, action: 'approve' },
      {
        onSuccess: done('Проект подтверждён'),
        onError: failed('Не удалось подтвердить проект'),
      },
    )

  const reject = () => {
    const text = comment.trim()
    if (!text) {
      setCommentError('Напишите, что исправить')
      return
    }
    review(
      { id: campaign.id, action: 'reject', comment: text },
      {
        onSuccess: (saved) => {
          setRejecting(false)
          setComment('')
          done('Проект возвращён на доработку')(saved)
        },
        onError: failed('Не удалось вернуть проект'),
      },
    )
  }

  return (
    <div className="mt-3 rounded-2xl border border-line bg-paper/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
          3D проект
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900">
          <Box size={16} />
        </span>
      </div>

      {/* Экспонент проект не грузит — пока его нет, просто говорим об этом. */}
      {!isManager && !project ? (
        <p className="mt-3 text-[13px] text-ink-muted">
          Площадка ещё не загрузила 3D проект.
        </p>
      ) : (
        <FilePicker
          className="mt-3"
          kind="project"
          accept={PROJECT_ACCEPT}
          icon={Box}
          emptyLabel="Перетащите файл сюда или выберите"
          downloadLabel="Скачать 3D проект"
          name={project?.name}
          url={project?.url}
          addedAt={project?.addedAt}
          onPick={pickProject}
          // Пока проект у экспонента, файл не меняем: он отвечает на этот.
          disabled={!isManager || awaitingReply}
        />
      )}
      {isManager && !project && (
        <p className="mt-2 text-[11px] text-ink-muted">
          SKP, 3DS, MAX, OBJ, FBX, GLB, DWG, PDF, картинка или архив.
        </p>
      )}

      {/* Замечание экспонента: площадке — что исправить, экспоненту — что
          он отправил. */}
      {status === 'project_rework' && campaign.projectComment && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
            {isAdvertiser ? 'Ваше замечание' : 'Замечание экспонента'}
          </p>
          <p className="mt-1 whitespace-pre-line text-[13px] text-ink">
            {campaign.projectComment}
          </p>
          {isAdvertiser && (
            <p className="mt-1.5 text-[12px] text-ink-muted">
              Площадка исправит проект и пришлёт его заново.
            </p>
          )}
        </div>
      )}

      {/* Площадка: отправить экспоненту — впервые, после доработки или новую
          версию после согласования. */}
      {isManager && project && !awaitingReply && (
        <Button
          variant="primary"
          className="mt-3 w-full"
          onClick={send}
          disabled={isPending}
        >
          <Send size={16} />
          {status === 'project_rework'
            ? 'Отправить исправленный проект'
            : status === 'project_approved'
              ? 'Отправить новую версию'
              : 'Отправить экспоненту'}
        </Button>
      )}
      {isManager && awaitingReply && (
        <p className="mt-3 text-[12px] text-ink-muted">
          Проект у экспонента — ждём подтверждения.
        </p>
      )}

      {/* Экспонент: ответ на присланный проект. */}
      {isAdvertiser && awaitingReply && !rejecting && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Button variant="primary" onClick={approve} disabled={isPending}>
            <Check size={16} />
            Подтвердить
          </Button>
          <Button
            variant="secondary"
            onClick={() => setRejecting(true)}
            disabled={isPending}
          >
            <RotateCcw size={16} />
            На доработку
          </Button>
        </div>
      )}
      {isAdvertiser && awaitingReply && rejecting && (
        <div className="mt-3 space-y-3">
          <Field label="Что исправить" required error={commentError}>
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => {
                setComment(e.target.value)
                setCommentError('')
              }}
              placeholder="Например, сдвинуть стойку ресепшн к проходу"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setRejecting(false)
                setCommentError('')
              }}
            >
              Отмена
            </Button>
            <Button variant="primary" onClick={reject} disabled={isPending}>
              Вернуть на доработку
            </Button>
          </div>
        </div>
      )}
      {isAdvertiser && status === 'project_approved' && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-teal-700">
          <Check size={14} />
          Вы подтвердили проект.
        </p>
      )}

      {/* Журнал согласования: кто, когда и что сделал с проектом. */}
      {log.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-ink-muted">
            История согласования
          </p>
          <ul className="mt-2 space-y-1.5">
            {log.map((entry) => (
              <li key={entry.id} className="text-[12px] text-ink-soft">
                <span className="text-ink-muted tnum">
                  {formatDateTime(entry.at)}
                </span>{' '}
                · {entry.by} {LOG_LABELS[entry.action] ?? entry.action}
                {entry.comment && (
                  <span className="text-ink">: «{entry.comment}»</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
