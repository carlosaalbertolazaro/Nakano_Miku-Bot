import GroupDb from './database/GroupDb.js'

const CHECK_INTERVAL_MS = 60_000
const REMINDER_LEAD_MS = 30 * 60_000

let intervalHandle = null

// Chequeo periódico (cada 1 min) en vez de un setTimeout por evento, para
// que los recordatorios sigan andando bien aunque el bot se reinicie entre
// medio (un setTimeout se perdería con el proceso, esto no). Idempotente:
// zen.js llama esto en cada 'connection === open', que puede pasar varias
// veces por reconexiones — sin este guard se acumularía un interval nuevo
// por cada reconexión y los recordatorios se mandarían duplicados.
export function startEventScheduler(conn) {
  if (intervalHandle) clearInterval(intervalHandle)

  intervalHandle = setInterval(async () => {
    try {
      const groups = await GroupDb.getAll()
      const now = Date.now()

      for (const groupDb of groups) {
        if (!groupDb.events?.length) continue
        let changed = false

        for (const evento of groupDb.events) {
          if (evento.done) continue

          if (!evento.reminded && now >= evento.timestamp - REMINDER_LEAD_MS && now < evento.timestamp) {
            evento.reminded = true
            changed = true
            for (const jid of evento.attendees) {
              conn.sendMessage(jid, {
                text: `*『 ⏰ 』RECORDATORIO*\n> *${evento.title}* empieza en 30 minutos.`
              }).catch(() => {})
            }
          }

          if (now >= evento.timestamp) {
            evento.done = true
            changed = true
          }
        }

        if (changed) await groupDb.save()
      }
    } catch (e) {
      console.error('[EVENT SCHEDULER ERROR]', e.message)
    }
  }, CHECK_INTERVAL_MS)
}
