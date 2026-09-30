/**
 * Кто сейчас в платформе. Настоящего присутствия в API нет: сервер не
 * запоминает последний заход — см. docs/backend-mock.md, раздел «Кто в сети».
 * Пока раздаём демо-состояния.
 *
 * Честен здесь только текущий пользователь: он в платформе прямо сейчас.
 * Остальным значения считаются от порядкового номера, а не от случайного
 * числа, — иначе список скакал бы на каждой перерисовке.
 */

// Сколько минут человек уже в платформе.
const ONLINE_MINUTES = [3, 17, 48, 126]

// Сколько минут назад заходили те, кого сейчас нет.
const AWAY_MINUTES = [8, 26, 74, 190, 420, 1580, 4300]

const minutesAgo = (now, minutes) =>
  new Date(now - minutes * 60_000).toISOString()

/**
 * Присутствие по пользователям: `Map(id → { online, onlineSince, lastSeenAt })`. Отключённая учётка войти не может, поэтому она всегда
 * не в сети.
 */
export function presenceOf(users, meId) {
  const now = Date.now()

  return new Map(
    users.map((user, index) => {
      if (user.id === meId) {
        return [
          user.id,
          {
            online: true,
            onlineSince: minutesAgo(now, 2),
            lastSeenAt: new Date(now).toISOString(),
          },
        ]
      }

      // Каждый третий — в сети: столько и нужно, чтобы раздел было видно.
      const online = user.isActive && index % 3 === 1
      return [
        user.id,
        {
          online,
          onlineSince: online
            ? minutesAgo(now, ONLINE_MINUTES[index % ONLINE_MINUTES.length])
            : null,
          lastSeenAt: minutesAgo(
            now,
            online ? 0 : AWAY_MINUTES[index % AWAY_MINUTES.length],
          ),
        },
      ]
    }),
  )
}
