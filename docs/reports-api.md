# Отчёт за месяц — API для фронта

Площадка раз в месяц загружает файл статистики по договору — «Шаблон
импортируемого отчёта Setanta Statistics» (образец — `docs/statistics_sample.xlsx`).
Сервер разбирает его, хранит по месяцам, отдаёт семь таблиц, принимает правку
и выгружает отчёт обратно в Excel.

Все примеры ниже — настоящие ответы сервера на образце. Живая схема и Swagger:
`/api/v1/docs`, раздел **reports**.

---

## Коротко

| Метод  | Адрес                                         | Кто   | Что делает                        |
| ------ | --------------------------------------------- | ----- | --------------------------------- |
| `GET`  | `/contracts/:id/reports`                      | все   | месяцы, за которые загружен отчёт |
| `POST` | `/contracts/:id/reports/:period/import`       | admin | загрузить файл за месяц           |
| `GET`  | `/contracts/:id/reports/:period`              | все   | отчёт целиком — семь листов       |
| `PUT`  | `/contracts/:id/reports/:period/sheets/:code` | admin | сохранить один лист целиком       |
| `GET`  | `/contracts/:id/reports/:period/export`       | все   | скачать `.xlsx`                   |
| `GET`  | `/contracts/:id/reports/imports?period=`      | admin | история загрузок файлов           |

- Префикс — `/api/v1`, заголовок — `Authorization: Bearer <access>`, как везде.
- `:period` — месяц в формате `YYYY-MM`, например `2026-01`. Неправильный месяц
  (`2026-13`) — `404`.
- Рекламодатель видит только договоры своего бренда; чужой договор — `404`.
- `viewer` и `advertiser` читают и выгружают, но не загружают и не правят (`403`).

---

## Листы

Отчёт всегда состоит из семи листов, в порядке исходного файла:

| `code`   | `title`              | `kind`       |
| -------- | -------------------- | ------------ |
| `ss1uzb` | 2.1) SS1 UZB TV      | `spot_log`   |
| `ss2uzb` | 2.2) SS2 UZB TV      | `spot_log`   |
| `live1`  | 1.1) Live Events SS1 | `live_event` |
| `live2`  | 1.2) Live Events SS2 | `live_event` |
| `promo1` | 3.1) Event Promo SS1 | `spot_log`   |
| `promo2` | 3.2) Event Promo SS2 | `spot_log`   |
| `social` | 4.1) Social Media    | `social`     |

Таблицу выбирайте по `kind`, а не по `code` — форм всего три:

| `kind`       | Строка                              | Колонки в интерфейсе                                      |
| ------------ | ----------------------------------- | --------------------------------------------------------- |
| `spot_log`   | `{ item, date, time }`              | ITEM NAME, DATE, TIME                                     |
| `live_event` | `{ date, time, tournament, event }` | DATE, TIME, TOURNAMENT, EVENT                             |
| `social`     | `{ network, link, impressions }`    | ссылка, Impressions — двумя блоками: Instagram и Telegram |

- `date` — ISO `2026-01-09`; показывайте как `09.01.2026`.
- `time` — `HH:MM:SS`, например `19:09:13`. Часовой пояс не пересчитывается: время
  ровно такое, как в файле.
- `network` — `instagram` или `telegram`.
- `impressions` — целое число `≥ 0`.
- У листа `social` есть `totals` — сумма показов по сети. Сервер считает её сам,
  она не хранится и не отправляется обратно.

В логах выходов бывают строки следующего месяца (`2026-02-01` в январском
отчёте) — это ночной хвост эфиров последнего дня. Так и должно быть.

---

## TypeScript-типы

```ts
type Period = string // 'YYYY-MM'

type SpotLogRow = { item: string; date: string; time: string }
type LiveEventRow = {
  date: string
  time: string
  tournament: string
  event: string
}
type SocialRow = {
  network: 'instagram' | 'telegram'
  link: string
  impressions: number
}

type ReportSheet =
  | {
      code: string
      title: string
      kind: 'spot_log'
      version: number
      rows: SpotLogRow[]
    }
  | {
      code: string
      title: string
      kind: 'live_event'
      version: number
      rows: LiveEventRow[]
    }
  | {
      code: 'social'
      title: string
      kind: 'social'
      version: number
      rows: SocialRow[]
      totals: { instagram: number; telegram: number }
    }

type AttachedFile = { name: string; url: string; addedAt: string }

type ReportImport = {
  id: number
  period: Period
  at: string // когда загрузили
  by: string // кто загрузил
  file: AttachedFile | null
  rowCounts: Record<string, number> // строк по коду листа
}

type Report = {
  id: number
  contractId: number
  period: Period
  updatedAt: string
  sheets: ReportSheet[]
  lastImport: ReportImport | null // null для viewer и advertiser
}

type ReportMonth = {
  period: Period
  updatedAt: string
  lastImport: ReportImport | null
}
```

---

## 1. Месяцы с отчётом

```
GET /api/v1/contracts/16/reports
```

Массив (не страница), новые месяцы сверху. Пустой массив — отчётов ещё нет.

```json
[
  {
    "period": "2026-01",
    "updatedAt": "2026-09-27T05:11:24.655341+05:00",
    "lastImport": {
      "id": 1,
      "period": "2026-01",
      "at": "2026-09-27T05:11:24.655125+05:00",
      "by": "Администратор",
      "file": {
        "name": "Шаблон_отчёта.xlsx",
        "url": "/api/v1/files/5a43…a49d/download",
        "addedAt": "2026-09-27T05:11:24.654295+05:00"
      },
      "rowCounts": {
        "ss1uzb": 571,
        "ss2uzb": 487,
        "live1": 68,
        "live2": 43,
        "promo1": 748,
        "promo2": 562,
        "social": 14
      }
    }
  }
]
```

Используйте, чтобы:

- знать, у каких месяцев отчёт есть (запрос отчёта за месяц без файла — `404`);
- перед импортом предупредить «Отчёт за январь уже загружен — заменить?».

`lastImport` заполнен только у `admin`; `viewer` и `advertiser` получают `null` —
кто и какой файл загружал, им не показываем.

---

## 2. Импорт файла

```
POST /api/v1/contracts/16/reports/2026-01/import
Content-Type: multipart/form-data
file=<файл .xlsx>
```

```ts
const form = new FormData()
form.append('file', file) // File из <input type="file" accept=".xlsx">

const res = await fetch(
  `/api/v1/contracts/${contractId}/reports/${period}/import`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}` }, // Content-Type НЕ ставить — браузер сам добавит boundary
    body: form,
  },
)
```

**`201`** — отчёт целиком, в том же виде, что `GET` отчёта (см. п. 3). Можно сразу
рисовать таблицы, повторный запрос не нужен.

**Важно:**

- Повторный импорт того же месяца **заменяет** его целиком — ручные правки этого
  месяца пропадают. Исходный файл прошлой загрузки остаётся в истории (п. 6).
  Предупредите пользователя перед заменой.
- Другие месяцы договора не трогаются.
- Файл принимается целиком или никак: при любой ошибке ничего не сохраняется.

**Ошибки файла — `400`, код `report_invalid`.** Список проблем — в `error.details`
(не в `fields`):

```json
{
  "error": {
    "code": "report_invalid",
    "message": "Файл не принят: ошибок — 2. Исправьте их и загрузите файл снова",
    "fields": {},
    "details": [
      {
        "sheet": "2.1) SS1 UZB TV",
        "row": 5,
        "column": "DATE",
        "message": "Не удалось разобрать дату «31/31/2026»: ожидается М/Д/ГГГГ, например 1/9/2026"
      },
      {
        "sheet": "4.1) Social Media",
        "row": null,
        "column": null,
        "message": "Нет листа «4.1) Social Media»"
      }
    ]
  }
}
```

- Показывайте `message` заголовком, а `details` — списком «Лист · строка · колонка:
  текст». `row` — номер строки в Excel, как его видит пользователь.
- `sheet`, `row`, `column` могут быть `null` — ошибка про лист или файл целиком.
- В `details` не больше 100 записей; общее число — в `message`.

Частые ошибки файла:

| Что в `message`                                                       | Причина                             |
| --------------------------------------------------------------------- | ----------------------------------- |
| `Нет листа «…»`                                                       | в книге нет одного из семи листов   |
| `Не найдена строка заголовков: ITEM NAME \| DATE \| TIME`             | на листе нет строки заголовков      |
| `Файл не за выбранный месяц: в 2026-03 попадает 0 из 6 строк с датой` | выбран не тот месяц или не тот файл |
| `Файл не читается как книга Excel (.xlsx)`                            | файл битый или другого формата      |
| `Слишком много строк: больше 5000 на лист`                            | предел размера листа                |

**Неподходящий файл — `400`, код `validation_error`**, ошибка в `fields.file`
(не `.xlsx`, пустой, больше 20 МБ):

```json
{
  "error": {
    "code": "validation_error",
    "message": "Проверьте заполнение полей",
    "fields": { "file": "Неподходящее расширение файла: .xls" }
  }
}
```

---

## 3. Отчёт за месяц

```
GET /api/v1/contracts/16/reports/2026-01
```

**`200`** (строки сокращены):

```json
{
  "id": 1,
  "contractId": 16,
  "period": "2026-01",
  "updatedAt": "2026-09-27T05:11:24.655341+05:00",
  "sheets": [
    {
      "code": "ss1uzb",
      "title": "2.1) SS1 UZB TV",
      "kind": "spot_log",
      "version": 2,
      "rows": [
        {
          "item": "CLIENT - 10 PER DAY - 30 Sec - UZB TV",
          "date": "2026-01-01",
          "time": "19:09:13"
        }
      ]
    },
    {
      "code": "live1",
      "title": "1.1) Live Events SS1",
      "kind": "live_event",
      "version": 2,
      "rows": [
        {
          "date": "2026-01-01",
          "time": "21:30:00",
          "tournament": "Premier League",
          "event": "Liverpool - Leeds"
        }
      ]
    },
    {
      "code": "social",
      "title": "4.1) Social Media",
      "kind": "social",
      "version": 2,
      "rows": [
        {
          "network": "instagram",
          "link": "https://www.instagram.com/xxxxxx",
          "impressions": 51102
        }
      ],
      "totals": { "instagram": 188046, "telegram": 307200 }
    }
  ],
  "lastImport": {
    "id": 1,
    "at": "…",
    "by": "Администратор",
    "file": { "…": "…" },
    "rowCounts": { "…": 0 }
  }
}
```

- Всегда семь листов, в порядке таблицы выше.
- Ответ на весь месяц — около 2 500 строк, ~200 КБ: грузите один раз при открытии
  месяца, а не по листу.
- **Запомните `version` каждого листа** — она нужна при сохранении (п. 4).
- Месяц, за который файл не загружали, — `404`.

---

## 4. Сохранение листа

Лист правится в таблице и сохраняется **целиком** по кнопке: присылаете весь
список строк в нужном порядке. Можно менять значения, добавлять, удалять и
переставлять строки. Порядок строк = порядок массива.

```
PUT /api/v1/contracts/16/reports/2026-01/sheets/ss1uzb
Content-Type: application/json

{
  "version": 2,
  "rows": [
    { "item": "Ролик", "date": "2026-01-05", "time": "10:00" }
  ]
}
```

Строки — той же формы, что приходят в `GET` для этого `kind`. `time` можно
присылать как `10:00` или `10:00:00`. Отправлять `totals`, `code`, `title`
не нужно.

**`200`** — лист с новой версией. Замените у себя `version` этого листа на новую:

```json
{
  "code": "ss1uzb",
  "title": "2.1) SS1 UZB TV",
  "kind": "spot_log",
  "version": 3,
  "rows": [{ "item": "Ролик", "date": "2026-01-05", "time": "10:00:00" }]
}
```

**`409 version_conflict`** — лист успели изменить (коллега сохранил его или
заново загрузил файл месяца). Покажите «Данные изменились, обновите страницу»
и перезагрузите отчёт:

```json
{
  "error": {
    "code": "version_conflict",
    "message": "Данные изменились, обновите страницу",
    "fields": {}
  }
}
```

`version` можно не присылать — тогда сохранение пройдёт без проверки. Лучше
присылать всегда: иначе можно молча затереть чужую правку. Версия у каждого
листа своя: правка `ss1uzb` не мешает сохранить `live1`.

**`400 validation_error`** — ошибки по ячейкам, ключ `rows[индекс].поле`
(индекс с нуля, как в массиве):

```json
{
  "error": {
    "code": "validation_error",
    "message": "Проверьте заполнение полей",
    "fields": {
      "rows[0].network": "Значения tiktok нет среди допустимых вариантов.",
      "rows[0].impressions": "Убедитесь, что это значение больше либо равно 0."
    }
  }
}
```

Правила проверки:

| `kind`              | Поле                  | Правило                       |
| ------------------- | --------------------- | ----------------------------- |
| `spot_log`          | `item`                | не пустой, до 500 символов    |
| все, кроме `social` | `date`                | ISO `YYYY-MM-DD`              |
| все, кроме `social` | `time`                | `HH:MM` или `HH:MM:SS`        |
| `live_event`        | `tournament`, `event` | можно пустые, до 300 символов |
| `social`            | `network`             | `instagram` или `telegram`    |
| `social`            | `link`                | не пустая, до 500 символов    |
| `social`            | `impressions`         | целое число `≥ 0`             |
| все                 | `rows`                | массив, не больше 5 000 строк |

Неизвестный `code` листа — `404`.

---

## 5. Выгрузка в Excel

```
GET /api/v1/contracts/16/reports/2026-01/export
```

Отдаёт `.xlsx` с семью листами в раскладке исходного файла — его можно поправить
в Excel и загрузить обратно. Имя файла приходит в заголовке:
`Content-Disposition: attachment; filename*=utf-8''Report_%D0%94-2026-101_2026-01.xlsx`
(`Report_Д-2026-101_2026-01.xlsx`).

Ссылка **требует токен**, поэтому простой `<a href>` не подойдёт — тяните файл
запросом и сохраняйте блобом:

```ts
async function downloadReport(contractId: number, period: string) {
  const res = await fetch(
    `/api/v1/contracts/${contractId}/reports/${period}/export`,
    {
      headers: { Authorization: `Bearer ${access}` },
    },
  )
  if (!res.ok) throw await res.json()

  const disposition = res.headers.get('Content-Disposition') ?? ''
  const match = disposition.match(/filename\*=utf-8''([^;]+)/i)
  const filename = match
    ? decodeURIComponent(match[1])
    : `Report_${period}.xlsx`

  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  })
  a.click()
  URL.revokeObjectURL(url)
}
```

`Content-Disposition` открыт для CORS (`Access-Control-Expose-Headers`), так что
имя файла читается и когда фронт ходит к API с другого домена.

Выгрузка отражает текущее состояние: с учётом всех сохранённых правок.

---

## 6. История загрузок (только admin)

```
GET /api/v1/contracts/16/reports/imports
GET /api/v1/contracts/16/reports/imports?period=2026-01
```

Страница в обычном формате проекта — `{ items, nextCursor, total }`, параметры
`limit` и `cursor`; новые загрузки сверху.

```json
{
  "items": [
    {
      "id": 1,
      "period": "2026-01",
      "at": "2026-09-27T05:11:24.655125+05:00",
      "by": "Администратор",
      "file": {
        "name": "Шаблон_отчёта.xlsx",
        "url": "/api/v1/files/5a43…a49d/download",
        "addedAt": "2026-09-27T05:11:24.654295+05:00"
      },
      "rowCounts": {
        "ss1uzb": 571,
        "ss2uzb": 487,
        "live1": 68,
        "live2": 43,
        "promo1": 748,
        "promo2": 562,
        "social": 14
      }
    }
  ],
  "nextCursor": null,
  "total": 1
}
```

- `file.url` — исходный загруженный файл. Скачивается **без токена**, поэтому
  подходит обычная ссылка `<a href={apiHost + file.url} download>`. Адрес
  относительный — добавьте хост API.
- `rowCounts` — сколько строк пришло в каждый лист этой загрузкой.
- `viewer` и `advertiser` получают `403`.

---

## Прочее, что поменялось

- **Формат ошибок** дополнен полем `error.details`. Оно есть только у
  `report_invalid`; в остальных ошибках его нет, `fields` работает как раньше.
- **`POST /files`** больше не принимает `kind=report`: файл отчёта загружается
  только через импорт (п. 2).

## Сценарии экрана

**Открыть отчёт за месяц.** `GET /reports` → по списку понять, есть ли отчёт за
выбранный месяц → `GET /reports/:period` → семь таблиц по `kind`, запомнить
`version` каждого листа.

**Загрузить файл.** Если месяц уже в списке — предупредить о замене →
`POST …/import` → при `201` нарисовать отчёт из ответа; при `400 report_invalid`
показать `details` списком.

**Правка.** Пользователь меняет таблицу → «Сохранить» → `PUT …/sheets/:code` с
`version` и всеми строками → при `200` обновить `version`; при `409` —
«Данные изменились, обновите страницу» и перезагрузить отчёт; при `400` —
подсветить ячейки по ключам `rows[i].поле`.

**Скачать.** «Скачать Excel» → `GET …/export` блобом (п. 5).
