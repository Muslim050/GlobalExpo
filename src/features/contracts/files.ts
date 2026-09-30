import type { AttachedFile, ContractInput } from '@/api/types'

/** Файл в форме: у только что загруженного есть id из загрузчика. */
export interface PickedFile extends Partial<AttachedFile> {
  id?: number
}

interface ContractFiles {
  file?: PickedFile | null
  creative?: PickedFile | null
}

/**
 * Что отправить по файлам договора. Сервер отдаёт файл как `{name, url,
 * addedAt}` — без id, поэтому «оставить как было» выразить нечем: поле
 * трогаем, только когда файл заменили (у свежего есть id из загрузчика)
 * или убрали.
 */
export function contractFileInput(
  next: ContractFiles,
  before: ContractFiles | null | undefined,
): ContractInput {
  const input: ContractInput = {}

  if (next.file?.id) input.fileId = next.file.id
  else if (!next.file && before?.file) input.fileId = null

  if (next.creative?.id) input.creativeId = next.creative.id
  else if (!next.creative && before?.creative) input.creativeId = null

  return input
}
