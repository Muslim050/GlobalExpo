import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate'

// Разбор .xlsx без тяжёлых зависимостей: книга — это zip с XML внутри.
// Возвращаем листы как двумерные массивы строк.

const parser = new DOMParser()
const xml = (text) => parser.parseFromString(text, 'application/xml')

/** Номер колонки из адреса ячейки: A1 → 0, AB7 → 27. */
function columnIndex(ref) {
  const letters = ref.replace(/\d+/g, '')
  let index = 0
  for (const letter of letters) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }
  return index - 1
}

/** Общие строки книги — на них ссылаются ячейки с t="s". */
function sharedStrings(text) {
  if (!text) return []
  return [...xml(text).querySelectorAll('si')].map((si) =>
    [...si.querySelectorAll('t')]
      .map((t) => t.textContent)
      .join('')
      .trim(),
  )
}

function cellText(cell, strings) {
  const type = cell.getAttribute('t')
  if (type === 's') {
    return strings[Number(cell.querySelector('v')?.textContent)] ?? ''
  }
  if (type === 'inlineStr') {
    return (cell.querySelector('is')?.textContent || '').trim()
  }
  return (cell.querySelector('v')?.textContent || '').trim()
}

function sheetRows(text, strings) {
  return [...xml(text).querySelectorAll('row')].map((row) => {
    const cells = []
    for (const cell of row.querySelectorAll('c')) {
      const ref = cell.getAttribute('r')
      const index = ref ? columnIndex(ref) : cells.length
      cells[index] = cellText(cell, strings)
    }
    return [...cells].map((value) => value ?? '')
  })
}

/**
 * Все листы книги по порядку: [{ name, rows }].
 * Имя листа берём из workbook.xml, а файл листа — по связи rId.
 */
export async function readSheets(file) {
  const zip = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const read = (path) => (zip[path] ? strFromU8(zip[path]) : '')
  const strings = sharedStrings(read('xl/sharedStrings.xml'))

  const targets = new Map(
    [
      ...xml(read('xl/_rels/workbook.xml.rels')).querySelectorAll(
        'Relationship',
      ),
    ].map((rel) => [
      rel.getAttribute('Id'),
      rel.getAttribute('Target').replace(/^\/?(xl\/)?/, 'xl/'),
    ]),
  )

  const sheets = [
    ...xml(read('xl/workbook.xml')).querySelectorAll('sheets > sheet'),
  ]
    .map((sheet) => {
      const id = sheet.getAttributeNS(
        'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
        'id',
      )
      const path = targets.get(id)
      return path && zip[path]
        ? {
            name: sheet.getAttribute('name') || '',
            rows: sheetRows(read(path), strings),
          }
        : null
    })
    .filter(Boolean)

  if (sheets.length) return sheets

  // Запасной путь: книга без внятных связей — берём листы как есть.
  return Object.keys(zip)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path))
    .sort()
    .map((path, index) => ({
      name: `Лист ${index + 1}`,
      rows: sheetRows(read(path), strings),
    }))
}

/** Первый лист книги — когда имя листа не важно. */
export async function parseXlsx(file) {
  const [sheet] = await readSheets(file)
  if (!sheet) throw new Error('В файле нет листов')
  return sheet.rows
}

const squash = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

/** Лист по имени: «Event Promo SS 1» найдётся по «eventpromoss1». */
export function findSheet(sheets, name) {
  const wanted = squash(name)
  return (
    sheets.find((sheet) => squash(sheet.name) === wanted) ||
    sheets.find((sheet) => squash(sheet.name).includes(wanted)) ||
    null
  )
}

// --- Выгрузка ------------------------------------------------------------

const escapeXml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/** Буква колонки по индексу: 0 → A, 27 → AB. */
function columnLetter(index) {
  let letter = ''
  let rest = index + 1
  while (rest) {
    const remainder = (rest - 1) % 26
    letter = String.fromCharCode(65 + remainder) + letter
    rest = Math.floor((rest - 1) / 26)
  }
  return letter
}

/** Имя листа: Excel запрещает часть символов и режет длину до 31. */
function sheetTitle(name, index, taken) {
  const clean =
    String(name ?? '')
      .replace(/[[\]:*?/\\]/g, ' ')
      .trim()
      .slice(0, 31) || `Лист ${index + 1}`
  // Одинаковых имён книга не допускает — различаем номером.
  let title = clean
  let n = 2
  while (taken.has(title.toLowerCase())) {
    const suffix = ` ${n++}`
    title = clean.slice(0, 31 - suffix.length) + suffix
  }
  taken.add(title.toLowerCase())
  return title
}

function sheetXml(rows) {
  const body = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, columnIndex) =>
          value === '' || value === null || value === undefined
            ? ''
            : `<c r="${columnLetter(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`,
        )
        .join('')
      return `<row r="${rowIndex + 1}">${cells}</row>`
    })
    .join('')

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${body}</sheetData></worksheet>`
  )
}

/**
 * Книга из нескольких листов: sheets — [{ name, rows }]. Значения пишем
 * строками (inlineStr), этого хватает и для чисел.
 */
export function buildXlsxBook({ sheets = [] }) {
  const list = sheets.length ? sheets : [{ name: 'Sheet1', rows: [] }]
  const taken = new Set()
  const named = list.map((sheet, index) => ({
    name: sheetTitle(sheet.name, index, taken),
    rows: sheet.rows ?? [],
  }))

  const files = {
    '[Content_Types].xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      named
        .map(
          (_, index) =>
            `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
        )
        .join('') +
      '</Types>',
    '_rels/.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
      '</Relationships>',
    'xl/workbook.xml':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheets>' +
      named
        .map(
          (sheet, index) =>
            `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
        )
        .join('') +
      '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels':
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      named
        .map(
          (_, index) =>
            `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
        )
        .join('') +
      '</Relationships>',
  }

  for (const [index, sheet] of named.entries()) {
    files[`xl/worksheets/sheet${index + 1}.xml`] = sheetXml(sheet.rows)
  }

  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(files).map(([path, content]) => [path, strToU8(content)]),
    ),
  )
  return new Blob([zipped], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** Книга из одного листа — частый случай отдельной таблицы. */
export function buildXlsx({ sheetName = 'Sheet1', rows = [] }) {
  return buildXlsxBook({ sheets: [{ name: sheetName, rows }] })
}

/** Сохранение блоба на диск через временную ссылку. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
