import { useState } from 'react'
import { useUploadFile } from './queries'
import { useToast } from '@/components/ui/Toast.jsx'

/**
 * Загрузка пачки файлов: по одному через `POST /files` с `kind`, затем
 * `onUploaded(files)` получает их как `{ id, name, url, addedAt }` — родитель
 * дописывает их к своей сущности. `progress` — «сколько из скольких» для
 * подписи; пока он не null, новая пачка не принимается.
 */
export function useUploadMany(kind, onUploaded) {
  const { mutateAsync: uploadFile } = useUploadFile()
  const toast = useToast()
  const [progress, setProgress] = useState(null)

  const addFiles = async (picked) => {
    // Копируем сразу: FileList из input обнулится, когда сбросим поле.
    const list = [...(picked ?? [])]
    if (!list.length || progress) return
    const uploaded = []
    try {
      for (const [i, file] of list.entries()) {
        setProgress({ done: i, total: list.length })
        const stored = await uploadFile({ file, kind })
        uploaded.push({
          id: stored.id,
          name: stored.name,
          url: stored.url,
          addedAt: stored.addedAt,
        })
      }
      await onUploaded(uploaded)
    } catch (err) {
      toast.error(err.message || 'Не удалось загрузить файлы')
    } finally {
      setProgress(null)
    }
  }

  return { addFiles, progress }
}
